"use client";

import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import { dependencyFocus } from "@/components/dependency/dependency-focus";
import { evaluateRelease } from "@/lib/readiness";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ReadinessSummary, ReadinessChip } from "./readiness-summary";
import { WorkspaceFrame } from "./workspace-frame";
import { ReleaseViewTabs } from "./release-view-tabs";
import { releaseRequest } from "./release-request";
import { ReleaseContext } from "./release-context";
import { ReviewGuide } from "./review-guide";
import { ReleasePerspectives } from "./release-perspectives";
import { useReleaseNavigation } from "./use-release-navigation";
import type { DependencySelection } from "@/components/dependency/dependency-view";
import { useServerClock } from "./use-server-clock";
import type { PublicationValues } from "./publication-form";
import type {
  DecisionInput,
  CheckCategory,
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
  const t = useTranslations("Release");
  const common = useTranslations("Common");
  const productT = useTranslations("Product");
  const [detail, setDetail] = useState(initialDetail);
  const [product, setProduct] = useState(initialProduct);
  const [location, navigate] = useReleaseNavigation({ view: initialView });
  const { view, check: checkId, category } = location;
  const focusedCheckId = detail.checks.some(
    (check) => check.id === checkId && check.archivedAt === null,
  )
    ? checkId
    : null;
  const focusedCapabilityId = detail.scope.some(
    (item) => item.included && item.capabilityId === location.capability,
  )
    ? location.capability
    : null;
  const focusedComponentId = dependencyFocus(
    product,
    detail,
  ).assessmentComponents.some((item) => item.id === location.component)
    ? location.component
    : null;
  const subjectScope =
    view === "backend" || view === "qa"
      ? dependencyFocus(
          product,
          detail,
          focusedCapabilityId,
          focusedComponentId,
        ).checkScope
      : null;
  function selectView(next: ReleaseView) {
    navigate({
      view: next,
      check: null,
      category: null,
      capability: null,
      component: null,
    });
  }
  function reviewView(next: ReleaseView, capabilityId?: string) {
    const capability = detail.scope.find(
      (item) => item.included && item.capabilityId === capabilityId,
    );
    navigate({
      view: next,
      check: null,
      category: null,
      capability: capability?.capabilityId ?? null,
      component: null,
    });
  }
  function inspectCheck(id: string) {
    if (
      !detail.checks.some(
        (check) => check.id === id && check.archivedAt === null,
      )
    )
      return;
    navigate({ view: "qa", check: id });
  }
  function clearCheckFocus() {
    navigate({
      check: null,
      category: null,
      capability: null,
      component: null,
    });
  }
  function reviewChecks(capabilityId?: string) {
    reviewView("qa", capabilityId);
  }
  function selectDependencyFocus(focus: DependencySelection) {
    navigate({
      check: null,
      capability: focus.capabilityId,
      component: focus.componentId,
    });
  }
  function setCategory(next: CheckCategory | null) {
    navigate({ category: next });
  }
  const { now, advance, anchor } = useServerClock(serverNow, demo);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const editable = !demo && !!viewer && viewer.role !== "viewer";
  const canRecord = !demo && viewer?.role === "owner";
  const readiness = evaluateRelease(detail, now);
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
      setError(
        cause instanceof Error ? cause.message : t("workspace.saveFailed"),
      );
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
        breadcrumbs={
          demo
            ? undefined
            : [
                { label: common("boards"), href: "/boards" },
                {
                  label: product.board.name,
                  href: `/boards/${product.board.id}/releases`,
                },
                {
                  label: productT("assessments"),
                  href: `/boards/${product.board.id}/releases?section=releases`,
                },
                { label: assessment.candidateLabel },
              ]
        }
        actions={
          demo ? (
            <Button component={Link} href="/share/demo">
              {t("workspace.visualExample")}
            </Button>
          ) : (
            viewer && <UserMenu user={viewer.user} role={viewer.role} />
          )
        }
      />
      <WorkspaceFrame
        breadcrumbs={!demo}
        header={
          <Stack spacing={1.5}>
            {demo && <Alert severity="info">{t("workspace.example")}</Alert>}
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Stack spacing={0.5}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}
                >
                  {t("workspace.assessment")}
                </Typography>
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{
                    fontSize: { xs: "1.4rem", sm: "1.75rem" },
                    overflowWrap: "anywhere",
                  }}
                >
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
                    {t("workspace.targetRevision", {
                      target: assessment.targetEnvironment,
                      revision: assessment.revision,
                    })}
                  </Typography>
                </Stack>
              </Stack>
              {!demo && (
                <Tooltip title={t("workspace.refresh")}>
                  <IconButton
                    aria-label={t("workspace.refresh")}
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
                            : t("workspace.reloadFailed"),
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
          </Stack>
        }
        navigation={<ReleaseViewTabs view={view} onChange={selectView} />}
      >
        <Stack
          spacing={3}
          role="tabpanel"
          id={`assessment-panel-${view === "operations" ? "qa" : view}`}
          aria-labelledby={`assessment-tab-${view === "operations" ? "qa" : view}`}
          tabIndex={0}
        >
          {view === "release" && <ReviewGuide />}
          {error && (
            <Alert severity="error">
              {error}
              {t("workspace.conflictHelp")}
            </Alert>
          )}
          {checkId && !focusedCheckId && (
            <Alert
              severity="warning"
              action={
                <Button onClick={clearCheckFocus}>
                  {t("workspace.clearCheck")}
                </Button>
              }
            >
              {t("workspace.missingCheck")}
            </Alert>
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 3,
              alignItems: "start",
            }}
          >
            {view === "release" && (
              <ReadinessSummary
                readiness={readiness}
                detail={detail}
                editable={editable}
                onInspectCheck={inspectCheck}
                onReviewChecks={reviewChecks}
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
              onDependencyFocusChange={selectDependencyFocus}
              subjectScope={subjectScope}
              focusedCheckId={focusedCheckId}
              focusedCapabilityId={focusedCapabilityId}
              focusedComponentId={focusedComponentId}
              category={category}
              onCategoryChange={setCategory}
              onClearFocus={clearCheckFocus}
              onReviewView={reviewView}
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
      </WorkspaceFrame>
    </>
  );
}
