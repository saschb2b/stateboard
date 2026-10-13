"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ReleaseDecision } from "@/lib/release-types";

export interface PublicationValues {
  summary: string;
  targetEnvironment: string;
  audience: string;
  capabilities: {
    capabilityId: string;
    name: string;
    outcome: string;
    explanation: string;
  }[];
  assetIds: string[];
}
export function PublicationForm({
  decision,
  onPublish,
}: {
  decision: ReleaseDecision;
  onPublish: (values: PublicationValues) => Promise<void>;
}) {
  const t = useTranslations("Release");
  const [summary, setSummary] = useState("");
  const [audience, setAudience] = useState(
    decision.snapshot.assessment.audience,
  );
  const [targetEnvironment, setTargetEnvironment] = useState(
    decision.snapshot.assessment.targetEnvironment,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [copy, setCopy] = useState(() =>
    Object.fromEntries(
      decision.snapshot.scope
        .filter((item) => item.included)
        .map((item) => [
          item.capabilityId,
          {
            capabilityId: item.capabilityId,
            name: item.name,
            outcome: item.outcome,
            explanation: "",
          },
        ]),
    ),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (values: string[], id: string, checked: boolean) =>
    checked ? [...values, id] : values.filter((value) => value !== id);
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onPublish({
        summary,
        audience,
        targetEnvironment,
        capabilities: selected.flatMap((id) => (copy[id] ? [copy[id]] : [])),
        assetIds,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("publication.failed"),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Stack component="form" onSubmit={publish} spacing={2}>
      <Alert severity="info">{t("publication.help")}</Alert>
      <TextField
        label={t("publication.summary")}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        required
        multiline
        minRows={2}
        disabled={pending}
      />
      <TextField
        label={t("publication.environment")}
        value={targetEnvironment}
        onChange={(event) => setTargetEnvironment(event.target.value)}
        required
        disabled={pending}
      />
      <TextField
        label={t("publication.audience")}
        value={audience}
        onChange={(event) => setAudience(event.target.value)}
        required
        disabled={pending}
      />
      <Typography variant="subtitle2">
        {t("publication.capabilities")}
      </Typography>
      {decision.snapshot.scope
        .filter((item) => item.included)
        .map((item) => (
          <Box key={item.capabilityId}>
            <FormControlLabel
              label={item.name}
              control={
                <Checkbox
                  disabled={pending}
                  checked={selected.includes(item.capabilityId)}
                  onChange={(event) =>
                    setSelected(
                      toggle(selected, item.capabilityId, event.target.checked),
                    )
                  }
                />
              }
            />
            {selected.includes(item.capabilityId) && (
              <Stack spacing={1} sx={{ pl: 4 }}>
                {(["name", "outcome", "explanation"] as const).map((field) => (
                  <TextField
                    key={field}
                    size="small"
                    required
                    label={
                      field === "name"
                        ? t("publication.capabilityName")
                        : field === "outcome"
                          ? t("publication.outcome")
                          : t("publication.explanation")
                    }
                    value={copy[item.capabilityId]?.[field] ?? ""}
                    onChange={(event) =>
                      setCopy((previous) => {
                        const current = previous[item.capabilityId];
                        return current
                          ? {
                              ...previous,
                              [item.capabilityId]: {
                                ...current,
                                [field]: event.target.value,
                              },
                            }
                          : previous;
                      })
                    }
                    disabled={pending}
                    multiline={field !== "name"}
                  />
                ))}
              </Stack>
            )}
          </Box>
        ))}
      <Typography variant="subtitle2">{t("publication.images")}</Typography>
      {decision.snapshot.assets.map((asset) => (
        <FormControlLabel
          key={asset.id}
          label={asset.label}
          control={
            <Checkbox
              disabled={pending}
              checked={assetIds.includes(asset.id)}
              onChange={(event) =>
                setAssetIds(toggle(assetIds, asset.id, event.target.checked))
              }
            />
          }
        />
      ))}
      {decision.snapshot.assets.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t("publication.noImages")}
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" type="submit" disabled={pending}>
        {pending ? t("publication.publishing") : t("publication.createLink")}
      </Button>
    </Stack>
  );
}
