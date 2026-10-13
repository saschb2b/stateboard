"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Container, Stack, Typography } from "@mui/material";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import { ReleaseScope } from "@/components/capability/release-scope";
import { CapabilityVisualView } from "@/components/capability/capability-visual-view";
import { DependencyView } from "@/components/dependency/dependency-view";
import { CheckManager } from "@/components/evidence/check-manager";
import { evaluateRelease } from "@/lib/readiness";
import { ReadinessSummary } from "./readiness-summary";
import { ReleaseViewTabs } from "./release-view-tabs";
import { DecisionPanel } from "./decision-panel";
import { ReleaseAssetUploader } from "./release-asset-uploader";
import { releaseRequest } from "./release-request";
import { ReleaseContext } from "./release-context";
import { useReleaseView } from "./use-release-view";
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
                Product overview
              </Button>
              {viewer && <UserMenu user={viewer.user} role={viewer.role} />}
            </>
          )
        }
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {demo && (
            <Alert severity="info">
              Permanent example · Try each perspective to inspect passing,
              failing, stale, missing, and wrong-candidate evidence. No example
              data is stored in your workspace.
            </Alert>
          )}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Stack spacing={0.5}>
              <Typography variant="overline" color="primary">
                Release assessment
              </Typography>
              <Typography variant="h4">{assessment.candidateLabel}</Typography>
              <Typography color="text.secondary">
                {assessment.ownerLabel} · Revision {assessment.revision}
              </Typography>
            </Stack>
            {!demo && (
              <Button
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
                {reloading ? "Reloading…" : "Reload assessment"}
              </Button>
            )}
          </Stack>
          <ReleaseContext assessment={assessment} />
          {error && (
            <Alert severity="error">
              {error} Reload the assessment before retrying if another person
              changed it.
            </Alert>
          )}
          <ReadinessSummary readiness={readiness} />
          <ReleaseViewTabs view={view} onChange={changeView} />
          {view === "release" && (
            <ReleaseScope
              detail={detail}
              product={product}
              readiness={readiness}
              editable={editable}
              mutate={mutate}
            />
          )}
          {view === "visual" && (
            <CapabilityVisualView
              detail={detail}
              product={product}
              readiness={readiness}
            />
          )}
          {view === "backend" && (
            <Stack spacing={3}>
              <DependencyView
                detail={detail}
                product={product}
                readiness={readiness}
              />
              <CheckManager
                detail={detail}
                product={product}
                readiness={readiness}
                editable={editable}
                mutate={mutate}
                now={now}
                loadCheckRevisions={loadCheckRevisions}
              />
            </Stack>
          )}
          {(view === "qa" || view === "operations") && (
            <CheckManager
              detail={detail}
              product={product}
              readiness={readiness}
              editable={editable}
              mutate={mutate}
              now={now}
              operationsOnly={view === "operations"}
              loadCheckRevisions={loadCheckRevisions}
            />
          )}
          {view === "decision" && (
            <Stack spacing={3}>
              <DecisionPanel
                detail={detail}
                product={product}
                readiness={readiness}
                now={now}
                canRecord={canRecord}
                record={record}
                publish={publish}
                revoke={(token) =>
                  action(`/api/release-share-links/${token}`, {
                    method: "DELETE",
                  })
                }
              />
              {editable && (
                <ReleaseAssetUploader
                  assets={detail.assets.filter(
                    (asset) => asset.decisionId === null,
                  )}
                  upload={async (file, label) => {
                    const body = new FormData();
                    body.set("file", file);
                    body.set("label", label);
                    body.set(
                      "expectedRevision",
                      String(detail.assessment.revision),
                    );
                    await action(
                      `/api/releases/${detail.assessment.id}/assets`,
                      { method: "POST", body },
                    );
                  }}
                />
              )}
            </Stack>
          )}
        </Stack>
      </Container>
    </>
  );
}
