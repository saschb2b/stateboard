"use client";

import { useTranslations, useFormatter } from "next-intl";

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
  const t = useTranslations("Release");
  const format = useFormatter();
  const [recording, setRecording] = useState<{
    detail: ReleaseDetail;
    product: ProductContext;
    readiness: ReleaseEvaluation;
  } | null>(null);
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
            {t("decision.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {canRecord
              ? t("decision.ownerRevision", {
                  revision: detail.assessment.revision,
                })
              : t("decision.ownerHelp")}
          </Typography>
        </Box>
        {canRecord && (
          <Button
            variant="contained"
            onClick={() => setRecording({ detail, product, readiness })}
          >
            {t("decision.record")}
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
          {t("decision.publicLinks")}
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
                    ? t("common.approved")
                    : t("common.held")}{" "}
                  {t("decision.published")}
                  <Box
                    component="time"
                    dateTime={new Date(link.createdAt).toISOString()}
                    title={new Date(link.createdAt).toISOString()}
                  >
                    {format.dateTime(link.createdAt, {
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
                  {t("decision.openLink")}
                </Button>
                {canRecord && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => setRevoking(link.token)}
                  >
                    {t("decision.revoke")}
                  </Button>
                )}
              </Stack>
            </Stack>
          ))}
          {activeLinks.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {detail.decisions.length === 0
                ? t("decision.prepareHelp")
                : t("decision.noLinks")}
            </Typography>
          )}
        </Box>
      </Stack>
      <Dialog
        open={recording !== null}
        onClose={() => setRecording(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("decision.recordRelease")}</DialogTitle>
        <DialogContent>
          {recording && (
            <DecisionReview
              {...recording}
              record={record}
              onCancel={() => setRecording(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={publishing !== null}
        onClose={() => setPublishing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("decision.curate")}</DialogTitle>
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
        <DialogTitle>{t("decision.revokeTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>{t("decision.revokeHelp")}</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row">
              <Button disabled={pending} onClick={() => setRevoking(null)}>
                {t("common.cancel")}
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
                        : t("decision.revokeFailed"),
                    );
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {t("decision.revokeLink")}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
