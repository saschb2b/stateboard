"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Box,
  Container,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import type { CheckSubjectScope } from "@/components/evidence/check-scope";
import { evaluateRelease } from "@/lib/readiness";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ReadinessSummary, ReadinessChip } from "./readiness-summary";
import { ReleaseViewTabs } from "./release-view-tabs";
import { releaseRequest } from "./release-request";
import { ReleaseContext } from "./release-context";
import { ReleasePerspectives } from "./release-perspectives";
import { useReleaseView } from "./use-release-view";
import { useCheckFocus } from "./use-check-focus";
import { useServerClock } from "./use-server-clock";
import type { PublicationValues } from "./publication-form";
import type {
  DecisionInput,
  ProductContext,
  ReleaseDetail,
  ReleaseCheck,
  ReleaseEvaluation,
  ReleaseMutation,
  ReleaseView,
} from "@/lib/release-types";
import type { CurrentMember } from "@/lib/auth";

interface ReleaseResponse extends ReleaseDetail {
  product: ProductContext;
  readiness: ReleaseEvaluation;
}
export function ReleaseWorkspace({
  initialDetail,
  initialProduct,
  viewer,
  initialView = "release",
  now: serverNow,
  demo = false,
}: {
  initialDetail: ReleaseDetail;
  initialProduct: ProductContext;
  viewer?: CurrentMember;
  initialView?: ReleaseView;
  now: number;
  demo?: boolean;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [product, setProduct] = useState(initialProduct);
  const [view, changeView] = useReleaseView(initialView);
  const [checkId, setCheckId] = useCheckFocus();
  const [subjectScope, setSubjectScope] = useState<CheckSubjectScope | null>(
    null,
  );
  const focusedCheckId = detail.checks.some(
    (check) => check.id === checkId && check.archivedAt === null,
  )
    ? checkId
    : null;
  function selectView(next: ReleaseView) {
    if (next !== "backend") setSubjectScope(null);
    changeView(next);
  }
  function inspectCheck(id: string) {
    if (
      !detail.checks.some(
        (check) => check.id === id && check.archivedAt === null,
      )
    )
      return;
    setSubjectScope(null);
    changeView("qa");
    setCheckId(id);
  }
  function clearCheckFocus() {
    setCheckId(null);
    setSubjectScope(null);
    changeView("qa");
  }
  function selectCheckScope(scope: CheckSubjectScope | null) {
    setCheckId(null);
    setSubjectScope(scope);
  }
  const { now, advance, anchor } = useServerClock(serverNow, demo);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const editable = !demo && !!viewer && viewer.role !== "viewer";
  const canRecord = !demo && viewer?.role === "owner";
  const readiness = useMemo(() => evaluateRelease(detail, now), [detail, now]);
  useEffect(() => {
    if (demo) return;
    const delay =
      readiness.validUntil === null
        ? 30_000
        : Math.max(1, Math.min(30_000, readiness.validUntil - now + 1));
    const timeout = setTimeout(advance, delay);
    return () => clearTimeout(timeout);
  }, [demo, readiness.validUntil, now, advance]);
  const loadCheckRevisions = demo
    ? undefined
    : (checkId: string) =>
        releaseRequest<ReleaseCheck[]>(
          `/api/checks/${checkId}/revisions?releaseId=${detail.assessment.id}`,
        );
  async function reload() {
    const response = await releaseRequest<ReleaseResponse>(
      `/api/releases/${detail.assessment.id}`,
    );
    setDetail(response);
    setProduct(response.product);
    anchor(response.readiness.evaluatedAt);
  }
  async function action(url: string, options: RequestInit) {
    setError(null);
    try {
      await releaseRequest(url, options);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save.");
      throw cause;
    }
  }
  async function mutate(mutation: Omit<ReleaseMutation, "expectedRevision">) {
    await action(`/api/releases/${detail.assessment.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...mutation,
        expectedRevision: detail.assessment.revision,
      }),
    });
  }
  async function record(input: DecisionInput) {
    await action(`/api/releases/${detail.assessment.id}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }
  async function publish(
    decisionId: string,
    projectionInput: PublicationValues,
  ) {
    await action(`/api/releases/${detail.assessment.id}/share-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisionId, projectionInput }),
    });
  }
  const assessment = detail.assessment;
  return (
    <>
      <AppHeader
        homeHref={demo ? "/share/demo" : "/boards"}
        crumb={product.board.name}
        actions={
          demo ? (
            <Button component={Link} href="/share/demo">
              Visual example
            </Button>
          ) : (
            <>
              <Button
                component={Link}
                href={`/boards/${product.board.id}/releases`}
                size="small"
              >
                All releases
              </Button>
              {viewer && <UserMenu user={viewer.user} role={viewer.role} />}
            </>
          )
        }
      />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          {demo && <Alert severity="info">Example release · Read-only</Alert>}
          <Stack direction="row" justifyContent="space-between" gap={2}>
            <Stack spacing={0.5}>
              <Typography variant="h5" component="h1">
                {assessment.candidateLabel}
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                gap={1.5}
                flexWrap="wrap"
              >
                {view !== "release" && (
                  <ReadinessChip state={readiness.state} />
                )}
                <Typography variant="caption" color="text.secondary">
                  Target · {assessment.targetEnvironment} · Revision{" "}
                  {assessment.revision}
                </Typography>
              </Stack>
            </Stack>
            {!demo && (
              <Tooltip title="Refresh assessment">
                <IconButton
                  aria-label="Refresh assessment"
                  sx={{ alignSelf: "flex-start" }}
                  size="small"
                  disabled={reloading}
                  onClick={async () => {
                    setReloading(true);
                    setError(null);
                    try {
                      await reload();
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "Unable to reload.",
                      );
                    } finally {
                      setReloading(false);
                    }
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <ReleaseContext assessment={assessment} collapsible />
          {error && (
            <Alert severity="error">
              {error} Reload the assessment before retrying if another person
              changed it.
            </Alert>
          )}
          <ReleaseViewTabs view={view} onChange={selectView} />
          {checkId && !focusedCheckId && (
            <Alert
              severity="warning"
              action={
                <Button onClick={clearCheckFocus}>Clear check focus</Button>
              }
            >
              The linked check is not part of the current assessment. Choose a
              current check below.
            </Alert>
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns:
                view === "release"
                  ? {
                      xs: "minmax(0, 1fr)",
                      md: "minmax(0, 0.85fr) minmax(0, 1.4fr)",
                    }
                  : "minmax(0, 1fr)",
              gap: { xs: 4, md: 5 },
              alignItems: "start",
            }}
          >
            {view === "release" && (
              <ReadinessSummary
                readiness={readiness}
                detail={detail}
                editable={editable}
                onInspectCheck={inspectCheck}
                onReviewChecks={clearCheckFocus}
                onReviewDecision={() => selectView("decision")}
              />
            )}
            <ReleasePerspectives
              view={view}
              detail={detail}
              product={product}
              readiness={readiness}
              editable={editable}
              mutate={mutate}
              now={now}
              loadCheckRevisions={loadCheckRevisions}
              onCheckScopeChange={selectCheckScope}
              subjectScope={subjectScope}
              focusedCheckId={focusedCheckId}
              onClearFocus={clearCheckFocus}
              onInspectCheck={inspectCheck}
              onReviewView={selectView}
              canRecord={canRecord}
              record={record}
              publish={publish}
              revoke={(token) =>
                action(`/api/release-share-links/${token}`, {
                  method: "DELETE",
                })
              }
              upload={async (file, label) => {
                const body = new FormData();
                body.set("file", file);
                body.set("label", label);
                body.set(
                  "expectedRevision",
                  String(detail.assessment.revision),
                );
                await action(`/api/releases/${detail.assessment.id}/assets`, {
                  method: "POST",
                  body,
                });
              }}
            />
          </Box>
        </Stack>
      </Container>
    </>
  );
}
