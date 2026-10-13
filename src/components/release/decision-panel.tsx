"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { MutationForm } from "./mutation-form";
import { DecisionHistory } from "./decision-history";
import { PublicationForm, type PublicationValues } from "./publication-form";
import type {
  DecisionInput,
  ProductContext,
  ReleaseDecision,
  ReleaseDetail,
  ReleaseEvaluation,
  ReleaseShareLink,
} from "@/lib/release-types";

export function DecisionPanel({
  detail,
  product,
  readiness,
  now,
  canRecord,
  record,
  publish,
  revoke,
}: {
  detail: ReleaseDetail;
  product: ProductContext;
  readiness: ReleaseEvaluation;
  now: number;
  canRecord: boolean;
  record: (input: DecisionInput) => Promise<void>;
  publish: (
    decisionId: string,
    projectionInput: PublicationValues,
  ) => Promise<void>;
  revoke: (token: string) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [publishing, setPublishing] = useState<ReleaseDecision | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeLinks: ReleaseShareLink[] = detail.shares.filter(
    (link) => link.revokedAt === null,
  );
  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          gap={2}
        >
          <Stack>
            <Typography variant="h6">Human release decision</Typography>
            <Typography variant="body2" color="text.secondary">
              Approval requires every required check to pass with current
              evidence. A held decision can record the blockers and gaps.
            </Typography>
          </Stack>
          {canRecord && (
            <Button variant="contained" onClick={() => setRecording(true)}>
              Record decision
            </Button>
          )}
        </Stack>
        {!canRecord && (
          <Typography variant="caption" color="text.secondary">
            Only a workspace owner using a signed-in session can record or
            publish a decision.
          </Typography>
        )}
      </Paper>
      <DecisionHistory
        detail={detail}
        now={now}
        canPublish={canRecord}
        onPublish={setPublishing}
      />
      <Stack spacing={1}>
        <Typography variant="h6">Public review links</Typography>
        {activeLinks.map((link) => (
          <Paper key={link.token} sx={{ p: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              gap={1}
            >
              <Stack>
                <Typography variant="body2">
                  {link.projection.candidateLabel} · {link.projection.decision}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Published {new Date(link.createdAt).toISOString()}
                </Typography>
              </Stack>
              <Stack direction="row">
                <Button
                  component={Link}
                  href={`/share/releases/${link.token}`}
                  target="_blank"
                >
                  Open review link
                </Button>
                {canRecord && (
                  <Button
                    color="warning"
                    onClick={() => setRevoking(link.token)}
                  >
                    Revoke
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        ))}
        {activeLinks.length === 0 && (
          <Typography color="text.secondary">
            Prepare a curated share view from a recorded decision.
          </Typography>
        )}
      </Stack>
      <Dialog
        open={recording}
        onClose={() => setRecording(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record release decision</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {readiness.state !== "ready" && (
              <Alert severity="warning">
                This assessment cannot be approved yet. You can record a held
                decision.
              </Alert>
            )}
            <MutationForm
              key={`${detail.assessment.revision}-${readiness.state}`}
              fields={[
                {
                  name: "decision",
                  label: "Decision",
                  type: "select",
                  required: true,
                  options: [
                    { value: "held", label: "Hold release" },
                    ...(readiness.state === "ready"
                      ? [{ value: "approved", label: "Approve release" }]
                      : []),
                  ],
                },
                {
                  name: "rationale",
                  label: "Decision rationale",
                  required: true,
                  type: "textarea",
                },
                {
                  name: "screenIds",
                  label: "Screens to retain in this review",
                  type: "multi",
                  helper:
                    "Selected screenshots are copied into the decision record so later replacement or deletion cannot alter this review.",
                  options: product.screens.map((screen) => ({
                    value: screen.id,
                    label: screen.label ?? "Product screen",
                  })),
                },
                {
                  name: "assetIds",
                  label: "Private images to retain",
                  type: "multi",
                  helper:
                    "Choose supporting images for this review. Previously reviewed images are included only when selected here.",
                  options: detail.assets.map((asset) => ({
                    value: asset.id,
                    label: asset.decisionId
                      ? `${asset.label} · earlier review image`
                      : asset.label,
                  })),
                },
              ]}
              initial={{
                decision: "held",
                screenIds: [],
                assetIds: detail.assets
                  .filter((asset) => asset.decisionId === null)
                  .map((asset) => asset.id),
              }}
              submitLabel="Record reviewed snapshot"
              onCancel={() => setRecording(false)}
              onSubmit={async (values) => {
                await record({
                  expectedRevision: detail.assessment.revision,
                  decision: values.decision as DecisionInput["decision"],
                  rationale: String(values.rationale),
                  screenIds: values.screenIds as string[],
                  assetIds: values.assetIds as string[],
                });
                setRecording(false);
              }}
            />
          </Stack>
        </DialogContent>
      </Dialog>
      <Dialog
        open={publishing !== null}
        onClose={() => setPublishing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Curate the public review</DialogTitle>
        <DialogContent>
          {publishing && (
            <PublicationForm
              key={publishing.id}
              decision={publishing}
              onPublish={async (values) => {
                await publish(publishing.id, values);
                setPublishing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={revoking !== null}
        onClose={() => !pending && setRevoking(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Revoke this public link?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              People with this link will lose access to its review and retained
              images.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row">
              <Button disabled={pending} onClick={() => setRevoking(null)}>
                Cancel
              </Button>
              <Button
                disabled={pending}
                color="warning"
                variant="contained"
                onClick={async () => {
                  if (!revoking) return;
                  setPending(true);
                  setError(null);
                  try {
                    await revoke(revoking);
                    setRevoking(null);
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Unable to revoke.",
                    );
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Revoke link
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
