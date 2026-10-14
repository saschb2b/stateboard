"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import type { Capability, RegionCapability } from "@/lib/release-types";

interface RegionFeatureLinksProps {
  regionId: string;
  capabilities: Capability[];
  links: RegionCapability[];
  readOnly: boolean;
  preferredCapabilityId?: string;
  onChange: (
    regionId: string,
    capabilityId: string,
    linked: boolean,
  ) => Promise<void>;
}

export function RegionFeatureLinks({
  regionId,
  capabilities,
  links,
  readOnly,
  preferredCapabilityId,
  onChange,
}: RegionFeatureLinksProps) {
  const t = useTranslations("Visual");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkedIds = new Set(
    links
      .filter((link) => link.regionId === regionId)
      .map((link) => link.capabilityId),
  );
  const linked = capabilities.filter((item) => linkedIds.has(item.id));
  const available = capabilities.filter(
    (item) => item.archivedAt === null && !linkedIds.has(item.id),
  );
  const preferred = available.find((item) => item.id === preferredCapabilityId);
  const options = preferred
    ? [preferred, ...available.filter((item) => item.id !== preferred.id)]
    : available;
  async function change(capabilityId: string, isLinked: boolean) {
    if (pending || readOnly) return;
    setPending(true);
    setError(null);
    try {
      await onChange(regionId, capabilityId, isLinked);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("linkFeatureError"));
    } finally {
      setPending(false);
    }
  }
  return (
    <Stack spacing={1} sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
      <Typography variant="subtitle2">{t("linkedFeatures")}</Typography>
      <Typography variant="caption" color="text.secondary">
        {t("linkedFeaturesHelp")}
      </Typography>
      {linked.map((feature) => (
        <Stack key={feature.id} direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="body2"
            sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
          >
            {feature.name}
          </Typography>
          {!readOnly ? (
            <IconButton
              size="small"
              disabled={pending}
              aria-label={t("unlinkFeature", { name: feature.name })}
              onClick={() => void change(feature.id, false)}
            >
              <LinkOffIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      ))}
      {linked.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("noLinkedFeatures")}
        </Typography>
      ) : null}
      {!readOnly && options.length > 0 ? (
        <TextField
          select
          fullWidth
          size="small"
          label={t("linkFeature")}
          value=""
          disabled={pending}
          onChange={(event) => void change(event.target.value, true)}
        >
          {options.map((feature) => (
            <MenuItem
              key={feature.id}
              value={feature.id}
              sx={{ whiteSpace: "normal" }}
            >
              {feature.name}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      {!readOnly && capabilities.every((item) => item.archivedAt !== null) ? (
        <Typography variant="caption" color="text.secondary">
          {t("createFeatureHelp")}
        </Typography>
      ) : null}
      {pending ? (
        <Typography variant="caption" role="status">
          {t("saving")}
        </Typography>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
