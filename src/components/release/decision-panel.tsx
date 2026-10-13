"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
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
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        justifyContent="space-between"
        gap={1.5}
      >
        <Box>
          <Typography variant="subtitle1" component="h2">
            Release decision
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {canRecord
              ? `Owner review · Revision ${detail.assessment.revision}`
              : "A signed-in workspace owner records and publishes decisions."}
          </Typography>
        </Box>
        {canRecord && (
          <Button variant="contained" onClick={() => setRecording(true)}>
            Record decision
          </Button>
        )}
      </Stack>
      <DecisionHistory
        detail={detail}
        now={now}
        canPublish={canRecord}
        onPublish={setPublishing}
      />
      <Stack spacing={1}>
        <Typography variant="subtitle1" component="h2">
          Public review links
        </Typography>
        <Box>
          {activeLinks.map((link) => (
            <Stack
              key={link.token}
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ sm: "center" }}
              justifyContent="space-between"
              gap={1}
              sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {link.projection.candidateLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {link.projection.decision === "approved"
                    ? "Approved"
                    : "Held"}{" "}
                  · Published{" "}
                  <Box
                    component="time"
                    dateTime={new Date(link.createdAt).toISOString()}
                    title={new Date(link.createdAt).toISOString()}
                  >
                    {new Date(link.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </Box>
                </Typography>
              </Box>
              <Stack direction="row" sx={{ flexShrink: 0 }}>
                <Button
                  size="small"
                  component={Link}
                  href={`/share/releases/${link.token}`}
                  target="_blank"
                >
                  Open review link
                </Button>
                {canRecord && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => setRevoking(link.token)}
                  >
                    Revoke
                  </Button>
                )}
              </Stack>
            </Stack>
          ))}
          {activeLinks.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {detail.decisions.length === 0
                ? "Record a decision to prepare a public review."
                : "No public links. Open a recorded decision to prepare one."}
            </Typography>
          )}
        </Box>
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
