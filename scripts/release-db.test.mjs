import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";

const databaseUrl = process.env.STATEBOARD_INTEGRATION_DB_URL;

test(
  "release persistence: scoped evidence, decisions, retained media and publication",
  { skip: !databaseUrl },
  async () => {
    // Isolate every schema object and file; never reset a developer's application schema.
    const schema = `release_test_${process.pid}_${Date.now()}`;
    const admin = new pg.Client({ connectionString: databaseUrl });
    const dir = await fs.mkdtemp(
      path.join(os.tmpdir(), "stateboard-release-test-"),
    );
    await admin.connect();
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
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await admin.query(`SET search_path TO "${schema}"`);
      const files = (
        await fs.readdir(new URL("../migrations/", import.meta.url))
      )
        .filter((file) => file.endsWith(".sql"))
        .sort();
      for (const file of files)
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
      const { evaluateRelease } = await import("../src/lib/readiness.ts");
      const { buildReleaseProjection } =
        await import("../src/lib/release-projection.ts");
      const now = Date.now();
      await admin.query(
        `INSERT INTO workspaces(id,name,created_at) VALUES ('test','Test',$1),('other','Other',$1)`,
        [now],
      );
      await admin.query(
        `INSERT INTO "user"(id,name,email) VALUES ('owner','Owner','owner@example.test'),('viewer','Viewer','viewer@example.test'),('foreign','Foreign','foreign@example.test')`,
      );
      await admin.query(
        `INSERT INTO workspace_members(workspace_id,user_id,role,created_at) VALUES ('test','owner','owner',$1),('test','viewer','viewer',$1),('other','foreign','owner',$1)`,
        [now],
      );
      const actor = {
        userId: "owner",
        name: "Owner",
        credentialKind: "session",
      };
      const create = (name) =>
        db.createBoard({
          id: name,
          workspaceId: "test",
          name,
          description: null,
          createdBy: "owner",
        });
      await create("board-a");
      await create("board-b");
      await db.createBoard({
        id: "board-foreign",
        workspaceId: "other",
        name: "Foreign",
        description: null,
        createdBy: "foreign",
      });
      assert.equal(await db.readProductContext("board-a", "other"), null);
      await db.mutateProduct(
        "test",
        "board-a",
        {
          type: "capability.create",
          data: {
            name: "Export invoice",
            outcome: "A finance user receives a valid PDF",
            ownerLabel: "Billing",
            ownerUserId: "viewer",
          },
        },
        actor,
      );
      await assert.rejects(
        db.mutateProduct(
          "test",
          "board-a",
          {
            type: "capability.create",
            id: "manual-created",
            data: { name: "No", outcome: "No outcome", ownerLabel: "No" },
          },
          actor,
        ),
        { status: 400 },
      );
      await assert.rejects(
        db.mutateProduct(
          "test",
          "board-a",
          { type: "capability.update", data: { name: "No" } },
          actor,
        ),
        { status: 400 },
      );
      const capabilityId = (await db.readProductContext("board-a", "test"))
        .capabilities[0].id;
      await db.mutateProduct(
        "test",
        "board-b",
        {
          type: "capability.create",
          data: {
            name: "Other",
            outcome: "Other outcome",
            ownerLabel: "Other",
          },
        },
        actor,
      );
      const otherCapabilityId = (await db.readProductContext("board-b", "test"))
        .capabilities[0].id;
      await assert.rejects(
        db.mutateProduct(
          "test",
          "board-a",
          {
            type: "capability.update",
            id: otherCapabilityId,
            data: { name: "Hijacked" },
          },
          actor,
        ),
        { status: 404 },
      );
      await assert.rejects(
        db.mutateProduct(
          "test",
          "board-a",
          {
            type: "component.create",
            data: { name: "No", kind: "service", ownerLabel: "No" },
          },
          { userId: "viewer", name: "Viewer", credentialKind: "session" },
        ),
        { status: 403 },
      );
      await db.mutateProduct(
        "test",
        "board-a",
        {
          type: "component.create",
          data: {
            name: "Billing",
            kind: "service",
            ownerLabel: "Billing",
            ownerUserId: "viewer",
          },
        },
        actor,
      );
      const componentId = (await db.readProductContext("board-a", "test"))
        .components[0].id;
      await db.mutateProduct(
        "test",
        "board-a",
        {
          type: "capability_component.put",
          data: {
            capabilityId: capabilityId,
            componentId: componentId,
            relation: "calls",
            required: true,
          },
        },
        actor,
      );
      await db.mutateProduct(
        "test",
        "board-a",
        {
          type: "dependency.create",
          data: {
            consumerId: componentId,
            providerId: componentId,
            relation: "publishes",
            required: true,
          },
        },
        actor,
      );
      const input = {
        candidateLabel: "RC 1",
        candidateRef: "sha256:abc123",
        validationEnvironment: "staging",
        targetEnvironment: "production",
        audience: "finance",
        configurationRef: "flags:1",
        ownerLabel: "Release owner",
        capabilityIds: [capabilityId],
      };
      await assert.rejects(
        db.createReleaseAssessment(
          "test",
          "board-a",
          { ...input, candidateRef: "main" },
          actor,
        ),
        { status: 400 },
      );
      await assert.rejects(
        db.createReleaseAssessment(
          "test",
          "board-a",
          { ...input, capabilityIds: [otherCapabilityId] },
          actor,
        ),
        { status: 404 },
      );
      let detail = await db.createReleaseAssessment(
        "test",
        "board-a",
        input,
        actor,
      );
      const releaseId = detail.assessment.id;
      assert.equal(await db.readReleaseDetail(releaseId, "other"), null);
      assert.equal(evaluateRelease(detail, Date.now()).state, "needs_evidence");
      assert.equal(await db.readReleaseWorkspace(releaseId, "other"), null);
      assert.equal(await db.readReleaseWorkspace("absent", "test"), null);
      for (let revision = 0; revision < 6; revision++) {
        const [workspace] = await Promise.all([
          db.readReleaseWorkspace(releaseId, "test"),
          db.mutateProduct(
            "test",
            "board-a",
            {
              type: "component.update",
              id: componentId,
              data: { description: `Metadata revision ${revision}` },
            },
            actor,
          ),
        ]);
        assert.equal(
          workspace.product.releases.find((release) => release.id === releaseId)
            .revision,
          workspace.assessment.revision,
          "Concurrent metadata writes cannot mix shared assessment and architecture revisions",
        );
        assert.equal(
          workspace.readiness.state,
          evaluateRelease(workspace, workspace.readiness.evaluatedAt).state,
        );
      }
      detail = await db.readReleaseDetail(releaseId, "test");
      detail = await db.mutateRelease(
        "test",
        releaseId,
        {
          type: "check.create",
          expectedRevision: detail.assessment.revision,
          data: {
            subjectType: "capability",
            subjectId: capabilityId,
            claim: "Authorized user downloads a valid PDF",
            category: "functional",
            required: true,
            ownerLabel: "QA",
            method: "manual",
            environment: "staging",
            maxAgeMs: 86400000,
          },
        },
        actor,
      );
      const checkId = detail.checks[0].id;
      const evidence = {
        checkId: checkId,
        checkRevision: 1,
        candidateRef: input.candidateRef,
        environment: "staging",
        audience: input.audience,
        configurationRef: input.configurationRef,
        result: "pass",
        summary: "Downloaded valid PDF",
        source: "manual",
        runRef: "run-1",
        eventId: "pass-1",
        observedAt: Date.now(),
        referenceUrl: null,
      };
      await assert.rejects(
        db.mutateRelease(
          "test",
          releaseId,
          {
            type: "evidence.create",
            expectedRevision: detail.assessment.revision,
            data: { ...evidence, candidateRef: "sha256:wrong" },
          },
          actor,
        ),
        { status: 400 },
      );
      detail = await db.mutateRelease(
        "test",
        releaseId,
        {
          type: "evidence.create",
          expectedRevision: detail.assessment.revision,
          data: evidence,
        },
        actor,
      );
      assert.equal(evaluateRelease(detail, Date.now()).state, "ready");
      const firstRevision = detail.assessment.revision;
      detail = await db.mutateRelease(
        "test",
        releaseId,
        { type: "evidence.create", expectedRevision: 1, data: evidence },
        actor,
      );
      assert.equal(
        detail.assessment.revision,
        firstRevision,
        "identical retries do not mutate the revision",
      );
      assert.equal(detail.evidence.length, 1);
      await assert.rejects(
        db.mutateRelease(
          "test",
          releaseId,
          {
            type: "evidence.create",
            expectedRevision: detail.assessment.revision,
            data: { ...evidence, summary: "Conflicting retry" },
          },
          actor,
        ),
        { status: 409 },
      );
      await assert.rejects(
        admin.query(
          `UPDATE release_evidence SET result='fail' WHERE assessment_id=$1`,
          [releaseId],
        ),
        { code: "23514" },
      );
      detail = await db.mutateRelease(
        "test",
        releaseId,
        {
          type: "evidence.create",
          expectedRevision: detail.assessment.revision,
          data: {
            ...evidence,
            result: "fail",
            summary: "PDF invalid",
            runRef: "run-2",
            eventId: "fail-2",
            observedAt: evidence.observedAt + 1,
          },
        },
        actor,
      );
      detail = await db.mutateRelease(
        "test",
        releaseId,
        {
          type: "evidence.create",
          expectedRevision: detail.assessment.revision,
          data: {
            ...evidence,
            eventId: "old-pass",
            observedAt: evidence.observedAt - 1000,
          },
        },
        actor,
      );
      assert.equal(
        evaluateRelease(detail, Date.now()).state,
        "blocked",
        "late old pass cannot erase failure",
      );
      await assert.rejects(
        db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: detail.assessment.revision,
            decision: "approved",
            rationale: "Ship",
            screenIds: [],
          },
          actor,
        ),
        { status: 409 },
      );
      detail = await db.mutateRelease(
        "test",
        releaseId,
        {
          type: "evidence.create",
          expectedRevision: detail.assessment.revision,
          data: {
            ...evidence,
            eventId: "fixed-pass",
            runRef: "run-3",
            observedAt: evidence.observedAt + 2,
          },
        },
        actor,
      );
      const beforeChange = detail.assessment.revision;
      await db.mutateProduct(
        "test",
        "board-a",
        {
          type: "capability.update",
          id: capabilityId,
          data: { outcome: "A finance user downloads and archives a PDF" },
        },
        actor,
      );
      await assert.rejects(
        db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: beforeChange,
            decision: "approved",
            rationale: "Ship",
            screenIds: [],
          },
          actor,
        ),
        { status: 409 },
      );
      detail = await db.readReleaseDetail(releaseId, "test");
      assert.equal(
        detail.scope[0].definitionRevision,
        1,
        "release outcome remains pinned until adopted",
      );
      detail = await db.mutateRelease(
        "test",
        releaseId,
        {
          type: "scope.put",
          expectedRevision: detail.assessment.revision,
          data: {
            capabilityId: capabilityId,
            included: true,
            adoptLatest: true,
            scopeReason: "Adopt expanded outcome",
          },
        },
        actor,
      );
      assert.equal(detail.scope[0].definitionRevision, 2);
      assert.equal(detail.checks[0].revision, 2);
      assert.equal(
        evaluateRelease(detail, Date.now()).state,
        "needs_evidence",
        "old evidence cannot verify adopted outcome",
      );
      assert.equal(
        (await db.readReleaseCheckRevisions("test", releaseId, checkId)).length,
        2,
      );
      await assert.rejects(
        db.mutateRelease(
          "test",
          releaseId,
          {
            type: "check.revise",
            id: checkId,
            expectedRevision: detail.assessment.revision,
            data: { subjectType: "release", subjectId: null },
          },
          actor,
        ),
        { status: 400 },
      );
      detail = await db.mutateRelease(
        "test",
        releaseId,
        {
          type: "evidence.create",
          expectedRevision: detail.assessment.revision,
          data: {
            ...evidence,
            checkRevision: 2,
            eventId: "revision-2",
            runRef: "run-4",
            observedAt: Date.now(),
          },
        },
        actor,
      );
      await assert.rejects(
        db.mutateRelease(
          "test",
          releaseId,
          {
            type: "evidence.create",
            expectedRevision: detail.assessment.revision,
            data: {
              ...evidence,
              checkRevision: 2,
              eventId: "future-fail",
              result: "fail",
              observedAt: Date.now() + 60000,
            },
          },
          actor,
        ),
        { status: 400 },
      );
      await admin.query(
        `INSERT INTO api_keys(id,workspace_id,user_id,name,key_hash,key_prefix,role,created_at,expires_at) VALUES('ci-key','test','owner','CI','test-hash','sbk_test','editor',$1,$2)`,
        [Date.now(), Date.now() + 86400000],
      );
      const keyActor = {
        ...actor,
        credentialKind: "api_key",
        credentialId: "ci-key",
      };
      const keyEvidence = {
        ...evidence,
        checkRevision: 2,
        eventId: "key-evidence",
        runRef: "ci-1",
        source: "CI",
        observedAt: Date.now(),
      };
      detail = await db.mutateRelease(
        "test",
        releaseId,
        {
          type: "evidence.create",
          expectedRevision: detail.assessment.revision,
          data: keyEvidence,
        },
        keyActor,
      );
      assert.equal(
        detail.evidence.find((row) => row.eventId === "key-evidence")
          .credentialId,
        "ci-key",
      );
      await admin.query(`UPDATE api_keys SET revoked_at=$1 WHERE id='ci-key'`, [
        Date.now(),
      ]);
      await assert.rejects(
        db.mutateRelease(
          "test",
          releaseId,
          {
            type: "evidence.create",
            expectedRevision: detail.assessment.revision,
            data: { ...keyEvidence, eventId: "revoked-key" },
          },
          keyActor,
        ),
        { status: 403 },
      );
      await assert.rejects(
        admin.query(
          `UPDATE release_assessments SET candidate_ref='sha256:changed' WHERE id=$1`,
          [releaseId],
        ),
        { code: "23514" },
      );
      await assert.rejects(
        admin.query(
          `UPDATE release_checks SET subject_type='release',subject_id=NULL WHERE id=$1`,
          [checkId],
        ),
        { code: "23514" },
      );
      await assert.rejects(
        admin.query(
          `UPDATE release_check_revisions SET claim='Altered claim' WHERE check_id=$1`,
          [checkId],
        ),
        { code: "23514" },
      );
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh1UAAAAASUVORK5CYII=",
        "base64",
      );
      await fs.mkdir(path.join(dir, "uploads"), { recursive: true });
      await fs.writeFile(path.join(dir, "uploads", "abcdefghijkl.png"), png);
      const { storeReleaseImage } =
        await import("../src/lib/release-assets.ts");
      const privateImage = await storeReleaseImage(
        png,
        "Private test evidence",
        releaseId,
      );
      detail = await db.createReleaseAsset(
        "test",
        releaseId,
        privateImage,
        actor,
        detail.assessment.revision,
      );
      await db.createScreen(
        {
          id: "screen",
          boardId: "board-a",
          filename: "abcdefghijkl.png",
          mimeType: "image/png",
          width: 1,
          height: 1,
          label: "Invoice",
        },
        "owner",
      );
      await db.createRegion(
        {
          id: "region",
          screenId: "screen",
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          state: "shipped",
          label: "Export",
          notes: null,
        },
        "owner",
      );
      await db.mutateProduct(
        "test",
        "board-a",
        {
          type: "region_capability.put",
          data: { regionId: "region", capabilityId },
        },
        actor,
      );
      detail = await db.readReleaseDetail(releaseId, "test");
      await assert.rejects(
        db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: detail.assessment.revision,
            decision: "approved",
            rationale: "Ship",
            screenIds: ["screen"],
          },
          { ...actor, credentialKind: "api_key" },
        ),
        { status: 403 },
      );
      const reviewedRevision = detail.assessment.revision;
      const simultaneous = await Promise.allSettled([
        db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: reviewedRevision,
            decision: "approved",
            rationale: "Ready",
            screenIds: ["screen"],
          },
          actor,
        ),
        db.mutateRelease(
          "test",
          releaseId,
          {
            type: "evidence.create",
            expectedRevision: reviewedRevision,
            data: {
              ...evidence,
              checkRevision: 2,
              eventId: "concurrent",
              observedAt: Date.now(),
            },
          },
          actor,
        ),
      ]);
      // Either evidence commits first and stale review conflicts, or review commits a coherent snapshot first.
      assert.equal(simultaneous[1].status, "fulfilled");
      if (simultaneous[0].status === "rejected")
        assert.equal(simultaneous[0].reason.status, 409);
      detail = await db.readReleaseDetail(releaseId, "test");
      if (!detail.decisions.length)
        detail = await db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: detail.assessment.revision,
            decision: "approved",
            rationale: "Ready",
            screenIds: ["screen"],
          },
          actor,
        );
      const decision = detail.decisions[0];
      assert.equal(decision.snapshot.readiness.state, "ready");
      assert.deepEqual(decision.snapshot.regionCapabilities, [
        { regionId: "region", capabilityId },
      ]);
      assert.equal(decision.snapshot.assets.length, 2);
      assert.ok(
        decision.snapshot.assets.some((asset) => asset.id === privateImage.id),
        "Private uploads participate in historical decisions",
      );
      const retained = decision.snapshot.assets.find(
        (asset) => asset.label === "Invoice",
      );
      assert.deepEqual(
        await fs.readFile(path.join(dir, "release-assets", retained.filename)),
        png,
      );
      await db.mutateProduct(
        "test",
        "board-a",
        {
          type: "region_capability.delete",
          data: { regionId: "region", capabilityId },
        },
        actor,
      );
      assert.equal(
        (await db.readProductContext("board-a", "test")).regionCapabilities
          .length,
        0,
      );
      assert.deepEqual(
        (await db.readReleaseDetail(releaseId, "test")).decisions.find(
          (item) => item.id === decision.id,
        ).snapshot.regionCapabilities,
        [{ regionId: "region", capabilityId }],
        "Live association deletion cannot rewrite recorded visual wiring",
      );
      await db.deleteScreen("screen", "owner");
      await fs.unlink(path.join(dir, "uploads", "abcdefghijkl.png"));
      assert.deepEqual(
        await fs.readFile(path.join(dir, "release-assets", retained.filename)),
        png,
      );
      assert.deepEqual(
        (await db.readReleaseDetail(releaseId, "test")).decisions.find(
          (item) => item.id === decision.id,
        ).snapshot.regionCapabilities,
        [{ regionId: "region", capabilityId }],
        "Live screen deletion preserves recorded visual wiring",
      );
      await assert.rejects(db.deleteBoard("board-a"), { status: 409 });
      assert.equal(
        await db.deleteBoard("board-b"),
        true,
        "legacy boards remain deletable",
      );
      const projection = buildReleaseProjection(decision, {
        summary: "Reviewed for finance",
        capabilities: [
          {
            capabilityId: capabilityId,
            name: "Export invoice",
            outcome: "Download an invoice",
            explanation: "",
          },
        ],
        assetIds: [retained.id],
      });
      const link = await db.createReleaseShare(
        "test",
        releaseId,
        decision.id,
        projection,
        actor,
      );
      const publicShare = await db.getPublicReleaseShare(link.token);
      assert.equal(publicShare.projection.readiness, "ready");
      assert.equal(
        publicShare.projection.validUntil,
        decision.snapshot.readiness.validUntil,
      );
      assert.equal(
        JSON.stringify(publicShare.projection).includes("run-4"),
        false,
      );
      assert.equal(
        (await db.getPublicReleaseAsset(link.token, retained.id)).id,
        retained.id,
      );
      assert.equal(await db.getPublicReleaseAsset(link.token, "missing"), null);
      assert.equal(await db.getReleaseAsset(retained.id, "other"), null);
      await db.revokeReleaseShare("test", link.token, actor);
      assert.equal(await db.getPublicReleaseShare(link.token), null);
      assert.equal(
        await db.getPublicReleaseAsset(link.token, retained.id),
        null,
      );
      detail = await db.readReleaseDetail(releaseId, "test");
      const decisionCount = detail.decisions.length;
      await fs.writeFile(
        path.join(dir, "release-assets", privateImage.filename),
        Buffer.from("corrupted"),
      );
      await assert.rejects(
        db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: detail.assessment.revision,
            decision: "held",
            rationale: "Reject corrupted selection",
            screenIds: [],
            assetIds: [privateImage.id],
          },
          actor,
        ),
        { status: 404 },
      );
      assert.equal(
        (await db.readReleaseDetail(releaseId, "test")).decisions.length,
        decisionCount,
        "Corrupted selected bytes cannot commit a decision",
      );
      const corruptedProjection = buildReleaseProjection(decision, {
        summary: "Selected evidence",
        capabilities: [],
        assetIds: [privateImage.id],
      });
      await assert.rejects(
        db.createReleaseShare(
          "test",
          releaseId,
          decision.id,
          corruptedProjection,
          actor,
        ),
        { status: 404 },
      );
      await fs.rm(path.join(dir, "release-assets", privateImage.filename));
      await assert.rejects(
        db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: detail.assessment.revision,
            decision: "held",
            rationale: "Reject missing selection",
            screenIds: [],
            assetIds: [privateImage.id],
          },
          actor,
        ),
        { status: 404 },
      );
      detail = await db.recordReleaseDecision(
        "test",
        releaseId,
        {
          expectedRevision: detail.assessment.revision,
          decision: "held",
          rationale: "New review without historical images",
          screenIds: [],
        },
        actor,
      );
      const freshDecision = detail.decisions.find(
        (candidate) => candidate.id !== decision.id,
      );
      assert.equal(
        freshDecision.snapshot.assets.length,
        0,
        "New decisions do not automatically accumulate historical media",
      );
      const pending = await storeReleaseImage(
        png,
        "Missing pending evidence",
        releaseId,
      );
      detail = await db.createReleaseAsset(
        "test",
        releaseId,
        pending,
        actor,
        detail.assessment.revision,
      );
      await fs.rm(path.join(dir, "release-assets", pending.filename));
      await assert.rejects(
        db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: detail.assessment.revision,
            decision: "held",
            rationale: "Default pending selection is checked",
            screenIds: [],
          },
          actor,
        ),
        { status: 404 },
      );
      detail = await db.recordReleaseDecision(
        "test",
        releaseId,
        {
          expectedRevision: detail.assessment.revision,
          decision: "held",
          rationale: "Explicitly omit missing media",
          screenIds: [],
          assetIds: [],
        },
        actor,
      );
      assert.equal(
        detail.assets.find((asset) => asset.id === pending.id).decisionId,
        null,
        "Unselected pending media is not attached to a decision",
      );
      const beforeRemoval = await db.readProductContext("board-a", "test");
      assert.equal(
        beforeRemoval.capabilities.find(
          (capability) => capability.id === capabilityId,
        ).ownerNeedsReassignment,
        false,
      );
      assert.equal(
        beforeRemoval.components.find(
          (component) => component.id === componentId,
        ).ownerNeedsReassignment,
        false,
      );
      const beforeRemovalRevision = (
        await db.readReleaseDetail(releaseId, "test")
      ).assessment.revision;
      assert.equal(
        await db.removeMember({ workspaceId: "test", userId: "viewer" }),
        true,
      );
      const afterRemovalDetail = await db.readReleaseDetail(releaseId, "test");
      assert.ok(
        afterRemovalDetail.assessment.revision > beforeRemovalRevision,
        "Assigned-member removal requires refreshed review",
      );
      assert.equal(
        afterRemovalDetail.checks.find((check) => check.id === checkId)
          .revision,
        2,
        "Membership changes do not invalidate matching functional claims",
      );
      const afterRemoval = await db.readProductContext("board-a", "test");
      const assignedCapability = afterRemoval.capabilities.find(
        (capability) => capability.id === capabilityId,
      );
      const assignedComponent = afterRemoval.components.find(
        (component) => component.id === componentId,
      );
      assert.equal(assignedCapability.ownerNeedsReassignment, true);
      assert.equal(assignedComponent.ownerNeedsReassignment, true);
      assert.equal(assignedCapability.ownerLabel, "Billing");
      assert.equal(assignedCapability.ownerUserId, "viewer");
      assert.equal(assignedComponent.ownerLabel, "Billing");
      assert.equal(assignedComponent.ownerUserId, "viewer");
      const historical = (
        await db.readReleaseDetail(releaseId, "test")
      ).decisions.find((item) => item.id === decision.id);
      assert.equal(
        historical.snapshot.components.find(
          (component) => component.id === componentId,
        ).ownerNeedsReassignment,
        false,
        "Historical membership assessment stays as reviewed",
      );
      assert.equal(
        historical.snapshot.components.find(
          (component) => component.id === componentId,
        ).ownerUserId,
        "viewer",
      );
      assert.equal(
        historical.snapshot.scope.find(
          (capability) => capability.capabilityId === capabilityId,
        ).ownerLabel,
        "Billing",
      );
      await admin.query(
        `UPDATE workspace_members SET role='viewer' WHERE workspace_id='test' AND user_id='owner'`,
      );
      detail = await db.readReleaseDetail(releaseId, "test");
      await assert.rejects(
        db.recordReleaseDecision(
          "test",
          releaseId,
          {
            expectedRevision: detail.assessment.revision,
            decision: "held",
            rationale: "Hold",
            screenIds: [],
          },
          actor,
        ),
        { status: 403 },
      );
    } finally {
      if (db) await db.getPool().end();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
      await fs.rm(dir, { recursive: true, force: true });
      hook.deregister();
    }
  },
);
