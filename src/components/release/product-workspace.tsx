"use client";

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
  Typography,
} from "@mui/material";
import { AppHeader } from "@/components/app/app-header";
import { WorkspaceFrame } from "./workspace-frame";
import { WorkspaceNavigation } from "./workspace-navigation";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
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
  const [product, setProduct] = useState(initialProduct);
  const [tab, setTab] = useProductSection();
  const [reloading, setReloading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const editable = viewer.role !== "viewer";
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
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to reload the product.",
      );
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
      setError(cause instanceof Error ? cause.message : "Unable to save.");
      throw cause;
    }
  }
  return (
    <>
      <AppHeader
        homeHref="/boards"
        crumb={product.board.name}
        actions={
          <>
            <Button
              component={Link}
              href={`/boards/${product.board.id}`}
              color="inherit"
              size="small"
            >
              Screens
            </Button>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      <WorkspaceFrame
        header={
          <Stack direction="row" justifyContent="space-between" gap={2}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Product workspace
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
            <Tooltip title="Refresh product">
              <IconButton
                size="small"
                aria-label="Refresh product"
                disabled={reloading}
                onClick={reload}
                sx={{ alignSelf: "flex-start" }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
        navigation={
          <WorkspaceNavigation
            label="Product sections"
            idPrefix="product"
            value={tab}
            onChange={setTab}
            sections={[
              {
                value: "overview",
                label: "Overview",
                icon: <DashboardOutlinedIcon fontSize="small" />,
              },
              {
                value: "releases",
                label: "Assessments",
                icon: <LayersOutlinedIcon fontSize="small" />,
              },
              {
                value: "capabilities",
                label: "Capabilities",
                icon: <ViewQuiltOutlinedIcon fontSize="small" />,
              },
              {
                value: "dependencies",
                label: "Components",
                icon: <WidgetsOutlinedIcon fontSize="small" />,
              },
              {
                value: "connections",
                label: "Connections",
                icon: <AccountTreeOutlinedIcon fontSize="small" />,
              },
            ]}
          />
        }
      >
        <Stack
          spacing={3}
          role="tabpanel"
          id={`product-panel-${tab}`}
          aria-labelledby={`product-tab-${tab}`}
          tabIndex={0}
        >
          {error && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" onClick={reload}>
                  Reload
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
              mutate={mutate}
            />
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
        <DialogTitle>New release assessment</DialogTitle>
        <DialogContent>
          <AssessmentCreateForm
            capabilities={product.capabilities}
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
