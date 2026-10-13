"use client";

import { useReleaseReason } from "@/components/release/use-release-reason";

import { useTranslations } from "next-intl";

import { useId, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type {
  CheckEvaluation,
  ReleaseCheck,
  ReleaseDetail,
} from "@/lib/release-types";
import { EvidenceHistory } from "./evidence-history";
import { CheckRevisionHistory } from "./check-revision-history";

export function CheckRow({
  check,
  subject,
  detail,
  evaluation,
  now,
  editable,
  initiallyExpanded,
  onRecord,
  onRevise,
  onArchive,
  loadRevisions,
}: {
  check: ReleaseCheck;
  subject: string;
  detail: ReleaseDetail;
  evaluation?: CheckEvaluation;
  now: number;
  editable: boolean;
  initiallyExpanded: boolean;
  onRecord: () => void;
  onRevise: () => void;
  onArchive: () => void;
  loadRevisions?: () => Promise<ReleaseCheck[]>;
}) {
  const t = useTranslations("Release");
  const localizeReason = useReleaseReason();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const panelId = useId();
  const statusId = useId();
  const color =
    evaluation?.state === "pass"
      ? "success.main"
      : evaluation?.state === "fail" && check.required
        ? "error.main"
        : "warning.main";
  return (
    <Box sx={{ "& + &": { borderTop: 1, borderColor: "divider" } }}>
      <ButtonBase
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={check.claim}
        aria-describedby={statusId}
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr) auto",
            sm: "minmax(0, 1fr) auto auto",
          },
          width: "100%",
          columnGap: 2,
          rowGap: 0.75,
          px: { xs: 2, sm: 2.5 },
          py: 2,
          textAlign: "left",
          alignItems: "center",
          "&:hover": { bgcolor: "action.hover" },
          "&.Mui-focusVisible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: -2,
          },
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            gridColumn: 1,
            gridRow: 1,
            overflowWrap: "anywhere",
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ display: "block", fontWeight: 600 }}
          >
            {check.claim}
          </Typography>
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.25 }}
          >
            {subject} · {check.ownerLabel}
          </Typography>
        </Box>
        <Typography
          id={statusId}
          component="span"
          variant="caption"
          sx={{
            color,
            gridColumn: { xs: 1, sm: 2 },
            gridRow: { xs: 2, sm: 1 },
            flexShrink: 0,
            textAlign: { xs: "left", sm: "right" },
          }}
        >
          {t(`results.${evaluation?.state ?? "not_evaluated"}`)}
          {!check.required && (
            <Box
              component="span"
              sx={{ display: "block", color: "text.secondary" }}
            >
              {t("common.optional")}
            </Box>
          )}
        </Typography>
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: "text.secondary",
            gridColumn: { xs: 2, sm: 3 },
            gridRow: { xs: "1 / 3", sm: 1 },
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
          }}
        />
      </ButtonBase>
      <Collapse in={expanded} unmountOnExit>
        <Stack id={panelId} spacing={2} sx={{ px: 2.5, pb: 2.5 }}>
          {evaluation && (
            <Typography variant="body2" sx={{ color }}>
              {localizeReason(evaluation.reason)}
            </Typography>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("check.verificationMethod")}
            </Typography>
            <Typography variant="body2">{check.method}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t("check.details", {
              requirement: check.required
                ? t("common.required")
                : t("check.optionalHelp"),
              category: t(`categories.${check.category}`),
              environment: check.environment,
              hours: check.maxAgeMs / 3_600_000,
              revision: check.revision,
            })}
          </Typography>
          {editable && (
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button variant="outlined" size="small" onClick={onRecord}>
                {t("check.recordEvidence")}
              </Button>
              <Button size="small" color="inherit" onClick={onRevise}>
                {t("check.revise")}
              </Button>
              <Button size="small" color="inherit" onClick={onArchive}>
                {t("check.archive")}
              </Button>
            </Stack>
          )}
          <EvidenceHistory
            detail={detail}
            check={check}
            evaluation={evaluation}
            now={now}
          />
          <Box>
            <CheckRevisionHistory check={check} load={loadRevisions} />
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
}
