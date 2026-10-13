import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";

const databaseUrl = process.env.STATEBOARD_INTEGRATION_DB_URL;

test(
  "MCP agents maintain a release with attributed evidence and current authorization",
  { skip: !databaseUrl, timeout: 60000 },
  async (t) => {
    // Match the release persistence suite: every table and file is disposable.
    const schema = `mcp_test_${process.pid}_${Date.now()}`;
    const admin = new pg.Client({ connectionString: databaseUrl });
    const dir = await fs.mkdtemp(
      path.join(os.tmpdir(), "stateboard-mcp-test-"),
    );
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousDataDir = process.env.STATEBOARD_DATA_DIR;
    let db;
    const hook = registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === "server-only")
          return nextResolve(specifier, {
            ...context,
            conditions: [...context.conditions, "react-server"],
          });
        try {
          return nextResolve(specifier, context);
        } catch (error) {
          if (
            error.code === "ERR_MODULE_NOT_FOUND" &&
            specifier.startsWith(".") &&
            !path.extname(specifier)
          )
            return nextResolve(`${specifier}.ts`, context);
          throw error;
        }
      },
    });
    await admin.connect();
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await admin.query(`SET search_path TO "${schema}"`);
      for (const file of (
        await fs.readdir(new URL("../migrations/", import.meta.url))
      )
        .filter((file) => file.endsWith(".sql"))
        .sort())
        await admin.query(
          await fs.readFile(
            new URL(`../migrations/${file}`, import.meta.url),
            "utf8",
          ),
        );
      const scoped = new URL(databaseUrl);
      scoped.searchParams.set("options", `-c search_path=${schema}`);
      process.env.DATABASE_URL = scoped.toString();
      process.env.STATEBOARD_DATA_DIR = dir;
      db = await import("../src/lib/db.ts");
      const { generateApiKey } = await import("../src/lib/api-keys.ts");
      const { minRole } = await import("../src/lib/types.ts");
      const { handleMcpMessage } = await import("../src/lib/mcp.ts");
      const { createMcpToolExecutor } = await import("../src/lib/mcp-tools.ts");
      const now = Date.now();
      await admin.query(
        `INSERT INTO workspaces(id,name,created_at) VALUES ('test','Test',$1),('other','Other',$1)`,
        [now],
      );
      await admin.query(
        `INSERT INTO "user"(id,name,email) VALUES ('editor','Agent owner','editor@example.test'),('viewer','Viewer','viewer@example.test'),('foreign','Foreign','foreign@example.test')`,
      );
      await admin.query(
        `INSERT INTO workspace_members(workspace_id,user_id,role,created_at) VALUES ('test','editor','editor',$1),('test','viewer','viewer',$1),('other','foreign','owner',$1)`,
        [now],
      );
      const makeMember = async (userId, workspaceId, role) => {
        const key = generateApiKey();
        await db.createApiKey({
          id: `${userId}-key`,
          workspaceId,
          userId,
          name: "MCP integration test",
          keyHash: key.keyHash,
          keyPrefix: key.keyPrefix,
          role,
          expiresAt: now + 86400000,
        });
        const principal = await db.findMemberByApiKeyHash(key.keyHash);
        assert.ok(
          principal,
          "A generated key resolves through real authentication storage",
        );
        return {
          member: {
            user: principal.user,
            workspaceId: principal.workspaceId,
            role: minRole(principal.keyRole, principal.memberRole),
            credentialKind: "api_key",
            credentialId: principal.apiKeyId,
          },
          keyHash: key.keyHash,
        };
      };
      const editor = await makeMember("editor", "test", "editor");
      const viewer = await makeMember("viewer", "test", "viewer");
      const foreign = await makeMember("foreign", "other", "editor");
      const phase = async (name, run) => {
        let failure;
        await t.test(name, async () => {
          try {
            await run();
          } catch (error) {
            failure = error;
            throw error;
          }
        });
        if (failure)
          throw new Error(`Agent workflow stopped at: ${name}`, {
            cause: failure,
          });
      };
      let requestId = 0;
      const rpc = (member, method, params) =>
        handleMcpMessage(
          { jsonrpc: "2.0", id: ++requestId, method, params },
          {
            serverInfo: { name: "stateboard-integration", version: "test" },
            callTool: createMcpToolExecutor(member),
          },
        );
      const call = async (name, args, member = editor.member) => {
        const response = await rpc(member, "tools/call", {
          name,
          arguments: args,
        });
        assert.equal(response.kind, "json");
        assert.equal(
          response.body.error,
          undefined,
          JSON.stringify(response.body),
        );
        return response.body.result;
      };
      const ok = async (name, args, member) => {
        const result = await call(name, args, member);
        assert.notEqual(
          result.isError,
          true,
          `${name}: ${JSON.stringify(result)}`,
        );
        assert.ok(
          result.structuredContent && "data" in result.structuredContent,
        );
        assert.deepEqual(
          JSON.parse(result.content[0].text),
          result.structuredContent.data,
        );
        return result.structuredContent.data;
      };
      const error = async (name, args, code, member) => {
        const result = await call(name, args, member);
        assert.equal(result.isError, true, `${name} must reject this request`);
        assert.equal(result.structuredContent.error.code, code);
        assert.equal(typeof result.structuredContent.error.message, "string");
      };
      let boardId;
      let capabilityId;
      let componentId;
      let providerId;
      let releaseId;
      let detail;
      let checkId;
      let evidence;
      const releaseArgs = (data, extra = {}) => ({
        release_id: releaseId,
        expected_revision: detail.assessment.revision,
        data,
        ...extra,
      });
      const readiness = () =>
        ok("get_release_readiness", { release_id: releaseId });

      await phase(
        "discover tools and bootstrap capability, architecture and visual mapping",
        async () => {
          const listed = await rpc(editor.member, "tools/list", {});
          const names = listed.body.result.tools.map((tool) => tool.name);
          for (const name of [
            "get_product",
            "get_release",
            "get_release_readiness",
            "submit_evidence",
          ])
            assert.ok(names.includes(name));
          assert.equal(
            names.some((name) => /decision|publish|release_share/.test(name)),
            false,
          );
          const forbiddenDecision = await rpc(editor.member, "tools/call", {
            name: "record_release_decision",
            arguments: {},
          });
          assert.equal(forbiddenDecision.body.error.code, -32602);
          const board = await ok("create_board", {
            name: "Isolated agent release workflow",
          });
          boardId = board.id;
          let product = await ok("create_capability", {
            board_id: boardId,
            data: {
              name: "Inspect readiness",
              outcome:
                "An agent can inspect the exact candidate's current release gaps",
              ownerLabel: "Product",
            },
          });
          capabilityId = product.capabilities[0].id;
          product = await ok("update_capability", {
            board_id: boardId,
            capability_id: capabilityId,
            data: {
              definitionRevision: product.capabilities[0].definitionRevision,
              outcome:
                "An authenticated agent can inspect the exact candidate's current release gaps",
            },
          });
          assert.equal(product.capabilities[0].definitionRevision, 2);
          product = await ok("create_component", {
            board_id: boardId,
            data: { name: "Readiness API", kind: "api", ownerLabel: "Backend" },
          });
          componentId = product.components[0].id;
          product = await ok("create_component", {
            board_id: boardId,
            data: {
              name: "Postgres",
              kind: "datastore",
              ownerLabel: "Operations",
            },
          });
          providerId = product.components.find(
            (row) => row.name === "Postgres",
          ).id;
          product = await ok("update_component", {
            board_id: boardId,
            component_id: componentId,
            data: { description: "Evaluates current persisted claims" },
          });
          assert.equal(
            product.components.find((row) => row.id === componentId)
              .description,
            "Evaluates current persisted claims",
          );
          product = await ok("link_capability_component", {
            board_id: boardId,
            data: {
              capabilityId,
              componentId,
              relation: "evaluates",
              required: true,
            },
          });
          assert.equal(product.capabilityComponents.length, 1);
          product = await ok("create_dependency", {
            board_id: boardId,
            data: {
              consumerId: componentId,
              providerId,
              relation: "reads assessment and evidence",
              required: true,
            },
          });
          assert.equal(product.dependencies.length, 1);
          await db.createScreen(
            {
              id: "screen",
              boardId,
              filename: "abcdefghijkl.png",
              mimeType: "image/png",
              width: 1,
              height: 1,
              label: "Readiness",
            },
            "editor",
          );
          const region = await ok("create_region", {
            screen_id: "screen",
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            state: "mock",
            label: "Readiness summary",
          });
          product = await ok("link_region_capability", {
            board_id: boardId,
            data: { regionId: region.id, capabilityId },
          });
          assert.deepEqual(product.regionCapabilities, [
            { regionId: region.id, capabilityId },
          ]);
          product = await ok("unlink_region_capability", {
            board_id: boardId,
            data: { regionId: region.id, capabilityId },
          });
          assert.equal(product.regionCapabilities.length, 0);
          product = await ok("get_product", { board_id: boardId });
          assert.equal(
            product.screens[0].regions[0].state,
            "mock",
            "Evidence readiness does not change production visual status",
          );
        },
      );

      await phase(
        "build a pinned candidate and discover its missing claims",
        async () => {
          detail = await ok("create_release", {
            board_id: boardId,
            data: {
              candidateLabel: "MCP integration candidate",
              candidateRef: "git:0123456789abcdef",
              validationEnvironment: "integration-test",
              targetEnvironment: "self-hosted-production",
              audience: "developers",
              configurationRef: "test:isolated-schema",
              ownerLabel: "Release owner",
              capabilityIds: [capabilityId],
            },
          });
          releaseId = detail.assessment.id;
          assert.equal(detail.readiness.state, "needs_evidence");
          let gaps = await readiness();
          assert.equal(
            gaps.uncoveredCapabilities[0].capabilityId,
            capabilityId,
          );
          assert.equal(gaps.latestDecision, null);
          detail = await ok(
            "set_release_scope",
            releaseArgs({
              capabilityId,
              included: true,
              scopeReason:
                "Agent release inspection is the candidate's bounded outcome",
            }),
          );
          const beforeCheck = detail.assessment.revision;
          const definition = {
            subjectType: "capability",
            subjectId: capabilityId,
            claim:
              "Authenticated MCP returns missing current-candidate evidence",
            category: "functional",
            required: true,
            ownerLabel: "QA",
            method:
              "Invoke get_release_readiness in the isolated MCP integration workflow",
            environment: "integration-test",
            maxAgeMs: 86400000,
          };
          detail = await ok("create_check", releaseArgs(definition));
          checkId = detail.checks[0].id;
          await error(
            "create_check",
            releaseArgs(definition, { expected_revision: beforeCheck }),
            "conflict",
          );
          gaps = await readiness();
          assert.equal(gaps.assessment.revision, detail.assessment.revision);
          assert.equal(gaps.uncoveredCapabilities.length, 0);
          assert.equal(gaps.findings[0].check.id, checkId);
          assert.equal(gaps.findings[0].evaluation.state, "missing");
          assert.ok(gaps.reviewPath.includes(releaseId));
          evidence = {
            checkId,
            checkRevision: 1,
            candidateRef: detail.assessment.candidateRef,
            environment: "integration-test",
            audience: detail.assessment.audience,
            configurationRef: detail.assessment.configurationRef,
            result: "pass",
            summary:
              "The test invoked MCP and received the missing current-candidate check with its exact revision",
            source: "MCP integration suite",
            runRef: "isolated-run-1",
            eventId: "inspect-readiness-1",
            observedAt: Date.now() - 1000,
            referenceUrl: null,
          };
        },
      );

      await phase(
        "reject context drift and make attributed evidence retries safe",
        async () => {
          const beforeEvidence = detail.assessment.revision;
          for (const [field, value] of Object.entries({
            candidateRef: "git:another-candidate",
            environment: "self-hosted-production",
            audience: "another-audience",
            configurationRef: "test:another-config",
          }))
            await error(
              "submit_evidence",
              releaseArgs({ ...evidence, [field]: value }),
              "validation_error",
            );
          detail = await ok("get_release", { release_id: releaseId });
          assert.equal(detail.evidence.length, 0);
          assert.equal(detail.assessment.revision, beforeEvidence);
          const submit = releaseArgs(evidence);
          detail = await ok("submit_evidence", submit);
          assert.equal(detail.readiness.state, "ready");
          const accepted = detail.evidence[0];
          assert.equal(accepted.credentialKind, "api_key");
          assert.equal(accepted.credentialId, "editor-key");
          assert.equal(accepted.actorId, "editor");
          const afterEvidence = detail.assessment.revision;
          detail = await ok("submit_evidence", submit);
          assert.equal(
            detail.assessment.revision,
            afterEvidence,
            "Retry after a lost response does not revise the assessment",
          );
          assert.equal(detail.evidence.length, 1);
          assert.equal(detail.evidence[0].id, accepted.id);
          await error(
            "submit_evidence",
            releaseArgs({ ...evidence, result: "fail" }),
            "conflict",
          );
          assert.equal((await readiness()).readiness.state, "ready");
          const listed = await ok("list_boards", {});
          assert.equal(
            listed.find((row) => row.id === boardId).latestRelease.state,
            "ready",
          );
          assert.equal(
            listed.find((row) => row.id === boardId).latestRelease.assessment
              .id,
            releaseId,
          );
          const product = await ok("get_product", { board_id: boardId });
          assert.equal(product.releaseOverviews[0].state, "ready");
        },
      );

      await phase(
        "newer failure wins over a late older pass and revised claims require fresh evidence",
        async () => {
          const failed = {
            ...evidence,
            eventId: "failure-2",
            runRef: "isolated-run-2",
            result: "fail",
            observedAt: Date.now() - 100,
            summary: "Synthetic failure verifies that readiness blocks",
          };
          detail = await ok("submit_evidence", releaseArgs(failed));
          const failedId = detail.evidence.find(
            (row) => row.eventId === failed.eventId,
          ).id;
          assert.equal(detail.readiness.state, "blocked");
          detail = await ok(
            "submit_evidence",
            releaseArgs({
              ...evidence,
              eventId: "delayed-pass",
              runRef: "isolated-run-old",
              observedAt: evidence.observedAt - 1000,
            }),
          );
          const blocked = await readiness();
          assert.equal(blocked.readiness.state, "blocked");
          assert.equal(blocked.findings[0].evaluation.evidenceId, failedId);
          detail = await ok(
            "revise_check",
            releaseArgs(
              {
                claim:
                  "Authenticated MCP returns the candidate's exact missing check and revision",
              },
              { check_id: checkId },
            ),
          );
          assert.equal(detail.checks[0].revision, 2);
          assert.equal(detail.readiness.state, "needs_evidence");
          await error(
            "submit_evidence",
            releaseArgs({ ...evidence, eventId: "wrong-definition" }),
            "conflict",
          );
          const history = await ok("get_check_history", {
            release_id: releaseId,
            check_id: checkId,
          });
          assert.equal(history.check.revision, 2);
          assert.deepEqual(
            history.definitions.map((row) => row.revision),
            [2, 1],
          );
          assert.equal(history.evidence.length, 3);
          detail = await ok(
            "submit_evidence",
            releaseArgs({
              ...evidence,
              checkRevision: 2,
              eventId: "revision-2-pass",
              observedAt: Date.now(),
              summary:
                "The integration assertions verified exact candidate, missing claim and active revision",
            }),
          );
          assert.equal(detail.readiness.state, "ready");
          detail = await ok("archive_check", {
            release_id: releaseId,
            expected_revision: detail.assessment.revision,
            check_id: checkId,
          });
          assert.equal(
            detail.readiness.state,
            "needs_evidence",
            "Archiving the only acceptance check cannot silently make scope ready",
          );
        },
      );

      await phase(
        "viewer and nested cross-workspace resources cannot mutate this product",
        async () => {
          assert.equal(
            (await ok("get_release", { release_id: releaseId }, viewer.member))
              .assessment.id,
            releaseId,
          );
          await error(
            "create_capability",
            {
              board_id: boardId,
              data: { name: "Forbidden", outcome: "No", ownerLabel: "Viewer" },
            },
            "forbidden",
            viewer.member,
          );
          await error(
            "submit_evidence",
            releaseArgs({ ...evidence, eventId: "viewer-write" }),
            "forbidden",
            viewer.member,
          );
          const foreignBoard = await ok(
            "create_board",
            { name: "Other workspace product" },
            foreign.member,
          );
          const foreignProduct = await ok(
            "create_component",
            {
              board_id: foreignBoard.id,
              data: {
                name: "Private provider",
                kind: "service",
                ownerLabel: "Other workspace",
              },
            },
            foreign.member,
          );
          await error(
            "get_product",
            { board_id: boardId },
            "not_found",
            foreign.member,
          );
          await error(
            "get_release",
            { release_id: releaseId },
            "not_found",
            foreign.member,
          );
          await error(
            "get_check_history",
            { release_id: releaseId, check_id: checkId },
            "not_found",
            foreign.member,
          );
          await error(
            "link_capability_component",
            {
              board_id: boardId,
              data: {
                capabilityId,
                componentId: foreignProduct.components[0].id,
                relation: "calls",
                required: true,
              },
            },
            "not_found",
          );
          await error(
            "create_dependency",
            {
              board_id: boardId,
              data: {
                consumerId: componentId,
                providerId: foreignProduct.components[0].id,
                relation: "calls",
                required: true,
              },
            },
            "not_found",
          );
        },
      );

      await phase(
        "invalid input fails without writes and cleanup tools preserve explicit scope",
        async () => {
          const before = await ok("get_product", { board_id: boardId });
          await error(
            "create_capability",
            {
              board_id: boardId,
              data: {
                name: "Bad",
                outcome: "No",
                ownerLabel: "QA",
                readiness: "ready",
              },
            },
            "validation_error",
          );
          await error(
            "create_component",
            {
              board_id: boardId,
              data: { name: "Bad", kind: "invented-kind", ownerLabel: "QA" },
            },
            "validation_error",
          );
          await error(
            "create_check",
            releaseArgs({
              subjectType: "release",
              subjectId: null,
              claim: "Bad",
              category: "functional",
              required: "yes",
              ownerLabel: "QA",
            }),
            "validation_error",
          );
          await error(
            "get_product",
            { board_id: boardId, workspace_id: "other" },
            "validation_error",
          );
          assert.equal(
            (await ok("get_product", { board_id: boardId })).capabilities
              .length,
            before.capabilities.length,
          );
          let product = await ok("delete_dependency", {
            board_id: boardId,
            dependency_id: before.dependencies[0].id,
          });
          assert.equal(product.dependencies.length, 0);
          product = await ok("unlink_capability_component", {
            board_id: boardId,
            data: { capabilityId, componentId },
          });
          assert.equal(product.capabilityComponents.length, 0);
          product = await ok("archive_component", {
            board_id: boardId,
            component_id: providerId,
          });
          assert.ok(
            product.components.find((row) => row.id === providerId).archivedAt,
          );
          product = await ok("archive_capability", {
            board_id: boardId,
            capability_id: capabilityId,
          });
          assert.ok(
            product.capabilities.find((row) => row.id === capabilityId)
              .archivedAt,
          );
        },
      );

      await phase(
        "check history remains coherent when another agent revises its definition during the read",
        async () => {
          detail = await ok("get_release", { release_id: releaseId });
          detail = await ok(
            "create_check",
            releaseArgs({
              subjectType: "release",
              claim: "Check history reports one consistent revision",
              category: "integration",
              required: false,
              ownerLabel: "Backend",
            }),
          );
          const concurrentCheck = detail.checks.find(
            (check) =>
              check.claim === "Check history reports one consistent revision",
          );
          const writeArgs = releaseArgs(
            {
              claim: "Check history remains coherent during concurrent changes",
            },
            { check_id: concurrentCheck.id },
          );
          let beginWrite;
          const writeGate = new Promise((resolve) => {
            beginWrite = resolve;
          });
          // Create this continuation outside the reader's async transaction context,
          // so the simulated second agent uses a separate database connection.
          const concurrentWrite = writeGate.then((proceed) =>
            proceed ? ok("revise_check", writeArgs) : null,
          );
          const originalQuery = pg.Client.prototype.query;
          let interleaved = false;
          let history;
          pg.Client.prototype.query = function (...args) {
            const response = originalQuery.apply(this, args);
            const [sql, values] = args;
            if (
              !interleaved &&
              typeof sql === "string" &&
              sql.startsWith("SELECT c.id,c.assessment_id") &&
              sql.includes("d.revision=c.active_revision") &&
              values?.[0] === releaseId
            ) {
              interleaved = true;
              return response.then(async (rows) => {
                beginWrite(true);
                await concurrentWrite;
                return rows;
              });
            }
            return response;
          };
          try {
            history = await ok("get_check_history", {
              release_id: releaseId,
              check_id: concurrentCheck.id,
            });
          } finally {
            pg.Client.prototype.query = originalQuery;
            beginWrite(false);
            await concurrentWrite;
          }
          assert.equal(
            interleaved,
            true,
            "The concurrent write ran after the active check was read",
          );
          assert.equal(history.check.revision, 1);
          assert.deepEqual(
            history.definitions.map((check) => check.revision),
            [1],
          );
          assert.equal(history.definitions[0].claim, history.check.claim);
          detail = await ok("get_release", { release_id: releaseId });
          const current = detail.checks.find(
            (check) => check.id === concurrentCheck.id,
          );
          assert.equal(
            current.revision,
            2,
            "A fresh request sees the concurrent edit",
          );
          assert.notEqual(current.claim, history.check.claim);
        },
      );

      await phase(
        "a previously authenticated executor respects live key revocation and member demotion",
        async () => {
          await admin.query(
            `UPDATE workspace_members SET role='viewer' WHERE workspace_id='test' AND user_id='editor'`,
          );
          const demoted = await db.findMemberByApiKeyHash(editor.keyHash);
          assert.equal(demoted.memberRole, "viewer");
          await error(
            "create_capability",
            {
              board_id: boardId,
              data: { name: "Stale role", outcome: "No", ownerLabel: "QA" },
            },
            "forbidden",
          );
          await admin.query(
            `UPDATE workspace_members SET role='editor' WHERE workspace_id='test' AND user_id='editor'`,
          );
          await db.revokeApiKey("editor-key");
          assert.equal(await db.findMemberByApiKeyHash(editor.keyHash), null);
          await error(
            "create_capability",
            {
              board_id: boardId,
              data: { name: "Revoked key", outcome: "No", ownerLabel: "QA" },
            },
            "forbidden",
          );
        },
      );
    } finally {
      if (db) await db.getPool().end();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
      await fs.rm(dir, { recursive: true, force: true });
      hook.deregister();
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
      if (previousDataDir === undefined) delete process.env.STATEBOARD_DATA_DIR;
      else process.env.STATEBOARD_DATA_DIR = previousDataDir;
    }
  },
);
