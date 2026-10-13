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
import { DecisionReview } from "./decision-review";
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
            {detail.decisions.length === 0
              ? "Ask the release owner to record a review before preparing a public update."
              : "Prepare a curated share view from a recorded decision."}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Public updates include the chosen outcomes, review conclusion, summary
          and explicitly selected images.
        </Typography>
      </Stack>
      <Dialog
        open={recording}
        onClose={() => setRecording(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record release decision</DialogTitle>
        <DialogContent>
          <DecisionReview
            detail={detail}
            product={product}
            readiness={readiness}
            record={record}
            onCancel={() => setRecording(false)}
          />
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
