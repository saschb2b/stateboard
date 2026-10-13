"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CheckSubjectScope } from "@/components/evidence/check-scope";
import { ReadinessChip } from "@/components/release/readiness-summary";
import type {
  ProductContext,
  ReleaseDetail,
  ReleaseEvaluation,
} from "@/lib/release-types";
import { DependencyComponentRow } from "./dependency-component-row";
import { dependencyFocus } from "./dependency-focus";

export interface DependencySelection {
  capabilityId: string | null;
  componentId: string | null;
}

/** Both directions matter: outcome → its architecture, component → affected outcomes. */
export function DependencyView({
  product,
  detail,
  readiness,
  onCheckScopeChange,
  initialCapabilityId,
  focus: selectedFocus,
  onFocusChange,
}: {
  product: ProductContext;
  detail: ReleaseDetail;
  readiness: ReleaseEvaluation;
  onCheckScopeChange?: (scope: CheckSubjectScope | null) => void;
  initialCapabilityId?: string | null;
  focus?: DependencySelection;
  onFocusChange?: (focus: DependencySelection) => void;
}) {
  const t = useTranslations("Product");
  const format = useFormatter();
  const [localCapabilityId, setCapabilityId] = useState<string | null>(() =>
    detail.scope.some(
      (item) => item.included && item.capabilityId === initialCapabilityId,
    )
      ? (initialCapabilityId ?? null)
      : null,
  );
  const [localComponentId, setComponentId] = useState<string | null>(null);
  const capabilityId = selectedFocus
    ? selectedFocus.capabilityId
    : localCapabilityId;
  const componentId = selectedFocus
    ? selectedFocus.componentId
    : localComponentId;
  const [expandedId, setExpandedId] = useState<string | null>(componentId);
  const summaryRefs = useRef(new Map<string, HTMLDivElement>());
  const scope = detail.scope.filter((item) => item.included);
  const focus = dependencyFocus(product, detail, capabilityId, componentId);
  const selectFocus = (capability: string | null, component: string | null) => {
    setCapabilityId(capability);
    setComponentId(component);
    setExpandedId(component);
    onFocusChange?.({ capabilityId: capability, componentId: component });
    onCheckScopeChange?.(
      dependencyFocus(product, detail, capability, component).checkScope,
    );
  };
  const name = (id: string) =>
    product.components.find((item) => item.id === id)?.name ??
    t("unavailableComponent");
  const activeChecks = detail.checks.filter(
    (check) => check.archivedAt === null,
  );
  const inspectDependency = (id: string) => {
    if (!focus.components.some((item) => item.id === id)) return;
    setExpandedId(id);
    const summary = summaryRefs.current.get(id);
    summary?.focus({ preventScroll: true });
    summary?.scrollIntoView({ block: "nearest", behavior: "instant" });
  };
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          select
          fullWidth
          size="small"
          label={t("capability")}
          value={capabilityId ?? "all"}
          onChange={(event) =>
            selectFocus(
              event.target.value === "all" ? null : event.target.value,
              null,
            )
          }
        >
          <MenuItem value="all">{t("allCapabilities")}</MenuItem>
          {scope.map((item) => (
            <MenuItem key={item.capabilityId} value={item.capabilityId}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label={t("componentImpact")}
          value={componentId ?? "all"}
          onChange={(event) =>
            selectFocus(
              null,
              event.target.value === "all" ? null : event.target.value,
            )
          }
        >
          <MenuItem value="all">{t("allComponents")}</MenuItem>
          {focus.assessmentComponents.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {focus.truncated && (
        <Alert severity="warning">{t("dependencyLimit")}</Alert>
      )}
      {componentId && (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t("affectedCapabilities")}
          </Typography>
          <Stack direction="row" gap={1.5} flexWrap="wrap">
            {focus.impacted.map((item) => (
              <Stack
                key={item.capabilityId}
                direction="row"
                gap={1}
                alignItems="center"
              >
                <Typography variant="body2">{item.name}</Typography>
                <ReadinessChip
                  state={
                    readiness.capabilities.find(
                      (check) => check.capabilityId === item.capabilityId,
                    )?.state ?? "needs_evidence"
                  }
                />
              </Stack>
            ))}
            {focus.impacted.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {t("noDeclaredPath")}
              </Typography>
            )}
          </Stack>
        </Box>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">
          {t("components")}{" "}
          <Box
            component="span"
            sx={{ color: "text.secondary", ml: 0.5, fontWeight: 400 }}
          >
            {format.number(focus.components.length)}
            {focus.checkScope
              ? ` / ${format.number(focus.assessmentComponents.length)}`
              : ""}
          </Box>
        </Typography>
        {focus.checkScope && (
          <Button size="small" onClick={() => selectFocus(null, null)}>
            {t("clearFocus")}
          </Button>
        )}
      </Stack>
      {focus.components.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t("noViewDependencies")}
        </Typography>
      ) : (
        <Paper sx={{ overflow: "hidden" }}>
          {focus.components.map((item) => (
            <DependencyComponentRow
              key={item.id}
              component={item}
              expanded={expandedId === item.id}
              onExpand={(expanded) => setExpandedId(expanded ? item.id : null)}
              summaryRef={(element) => {
                if (element) summaryRefs.current.set(item.id, element);
                else summaryRefs.current.delete(item.id);
              }}
              onInspectDependency={inspectDependency}
              checks={activeChecks.filter(
                (check) =>
                  check.subjectType === "component" &&
                  check.subjectId === item.id,
              )}
              readiness={readiness}
              scope={scope}
              outcomeLinks={product.capabilityComponents.filter(
                (link) =>
                  link.componentId === item.id &&
                  focus.capabilityIds.includes(link.capabilityId),
              )}
              dependencies={focus.dependencies.filter(
                (link) => link.consumerId === item.id,
              )}
              componentName={name}
            />
          ))}
        </Paper>
      )}
      <Typography variant="caption" color="text.secondary">
        {t("dependencyReadinessHelp")}
      </Typography>
    </Stack>
  );
}
