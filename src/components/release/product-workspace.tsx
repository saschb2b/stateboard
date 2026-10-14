"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { AppHeader } from "@/components/app/app-header";
import { WorkspaceFrame } from "./workspace-frame";
import { WorkspaceNavigation } from "./workspace-navigation";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { UserMenu } from "@/components/app/user-menu";
import { CapabilityManager } from "@/components/capability/capability-manager";
import { ComponentManager } from "@/components/dependency/component-manager";
import { ProductConnections } from "@/components/dependency/product-connections";
import { AssessmentCreateForm } from "./assessment-create-form";
import { releaseRequest } from "./release-request";
import { ProductReleaseList } from "./product-release-list";
import { ProductOverview } from "./product-overview";
import { useProductSection } from "./use-product-section";
import type {
  ProductContext,
  ProductMutation,
  ReleaseDetail,
} from "@/lib/release-types";
import type { CurrentMember } from "@/lib/auth";

export function ProductWorkspace({
  initialProduct,
  viewer,
}: {
  initialProduct: ProductContext;
  viewer: CurrentMember;
}) {
  const t = useTranslations("Product");
  const common = useTranslations("Common");
  const [product, setProduct] = useState(initialProduct);
  const [tab, setTab] = useProductSection();
  const [reloading, setReloading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const editable = viewer.role !== "viewer";
  const navigationTab = tab === "connections" ? "dependencies" : tab;
  async function reload() {
    setReloading(true);
    setError(null);
    try {
      setProduct(
        await releaseRequest<ProductContext>(
          `/api/boards/${product.board.id}/product`,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("reloadError"));
    } finally {
      setReloading(false);
    }
  }
  async function mutate(mutation: ProductMutation) {
    setError(null);
    try {
      setProduct(
        await releaseRequest<ProductContext>(
          `/api/boards/${product.board.id}/product`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mutation),
          },
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("saveError"));
      throw cause;
    }
  }
  return (
    <>
      <AppHeader
        homeHref="/boards"
        breadcrumbs={[
          { label: common("boards"), href: "/boards" },
          {
            label: product.board.name,
            ...(tab === "overview"
              ? {}
              : { href: `/boards/${product.board.id}/releases` }),
          },
          ...(tab === "overview"
            ? []
            : [
                {
                  label: t(
                    tab === "releases"
                      ? "assessments"
                      : tab === "dependencies" || tab === "connections"
                        ? "architecture"
                        : tab,
                  ),
                },
              ]),
        ]}
        actions={
          <>
            <Button
              component={Link}
              href={`/boards/${product.board.id}`}
              color="inherit"
              size="small"
            >
              {t("screens")}
            </Button>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      <WorkspaceFrame
        breadcrumbs
        header={
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                {t("workspace")}
              </Typography>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  maxWidth: 900,
                  fontSize: { xs: "1.4rem", sm: "1.75rem" },
                  overflowWrap: "anywhere",
                }}
              >
                {product.board.name}
              </Typography>
              {product.board.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ maxWidth: 760 }}
                >
                  {product.board.description}
                </Typography>
              )}
            </Stack>
            <Stack
              role="group"
              aria-label={common("boardTools")}
              direction="row"
              spacing={0.5}
              useFlexGap
              alignItems="center"
              sx={{ flexShrink: 0, flexWrap: "wrap", alignSelf: "flex-start" }}
            >
              {editable && (
                <Button
                  component={Link}
                  href={`/boards/${product.board.id}/settings`}
                  color="inherit"
                  size="small"
                  startIcon={<EditOutlinedIcon fontSize="small" />}
                >
                  {common("editBoard")}
                </Button>
              )}
              <Button
                component={Link}
                href={`/boards/${product.board.id}/history`}
                color="inherit"
                size="small"
                startIcon={<HistoryOutlinedIcon fontSize="small" />}
              >
                {common("history")}
              </Button>
              <Tooltip title={t("refresh")}>
                <IconButton
                  size="small"
                  aria-label={t("refresh")}
                  disabled={reloading}
                  onClick={reload}
                  sx={{ alignSelf: "flex-start" }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        }
        navigation={
          <WorkspaceNavigation
            label={t("sections")}
            idPrefix="product"
            value={navigationTab}
            onChange={setTab}
            sections={[
              {
                value: "overview",
                label: t("overview"),
                icon: <DashboardOutlinedIcon fontSize="small" />,
              },
              {
                value: "releases",
                label: t("assessments"),
                icon: <LayersOutlinedIcon fontSize="small" />,
              },
              {
                value: "capabilities",
                label: t("capabilities"),
                icon: <ViewQuiltOutlinedIcon fontSize="small" />,
              },
            ]}
            secondary={{
              label: t("supportingContext"),
              sections: [
                {
                  value: "dependencies",
                  label: t("architecture"),
                  icon: <AccountTreeOutlinedIcon fontSize="small" />,
                },
              ],
            }}
          />
        }
      >
        <Stack
          spacing={3}
          role="tabpanel"
          id={`product-panel-${navigationTab}`}
          aria-labelledby={`product-tab-${navigationTab}`}
          tabIndex={0}
        >
          {error && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" onClick={reload}>
                  {t("reload")}
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {tab === "overview" && (
            <ProductOverview
              product={product}
              editable={editable}
              onCreate={() => setCreating(true)}
              onNavigate={setTab}
            />
          )}
          {tab === "releases" && (
            <ProductReleaseList
              product={product}
              editable={editable}
              onCreate={() => setCreating(true)}
              onSetup={() => setTab("capabilities")}
            />
          )}
          {tab === "capabilities" && (
            <CapabilityManager
              product={product}
              editable={editable}
              ownerLabel={viewer.user.name ?? viewer.user.email}
              mutate={mutate}
            />
          )}
          {(tab === "dependencies" || tab === "connections") && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {t("architectureHelp")}
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={tab}
                aria-label={t("architecture")}
                size="small"
                onChange={(_, next: "dependencies" | "connections" | null) => {
                  if (next) setTab(next);
                }}
                sx={{ alignSelf: "flex-start", flexWrap: "wrap" }}
              >
                <ToggleButton value="dependencies">
                  {t("components")}
                </ToggleButton>
                <ToggleButton value="connections">
                  {t("connections")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          )}
          {tab === "dependencies" && (
            <ComponentManager
              product={product}
              editable={editable}
              mutate={mutate}
            />
          )}
          {tab === "connections" && (
            <ProductConnections
              product={product}
              editable={editable}
              mutate={mutate}
            />
          )}
        </Stack>
      </WorkspaceFrame>
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("newReleaseAssessment")}</DialogTitle>
        <DialogContent>
          <AssessmentCreateForm
            capabilities={product.capabilities}
            previous={product.releases[0]}
            ownerLabel={viewer.user.name ?? viewer.user.email}
            onSubmit={async (data) => {
              const release = await releaseRequest<ReleaseDetail>(
                `/api/boards/${product.board.id}/releases`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                },
              );
              router.push(
                `/boards/${product.board.id}/releases/${release.assessment.id}`,
              );
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
