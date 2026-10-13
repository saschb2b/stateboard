"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import { CapabilityManager } from "@/components/capability/capability-manager";
import { ComponentManager } from "@/components/dependency/component-manager";
import { ProductConnections } from "@/components/dependency/product-connections";
import { AssessmentCreateForm } from "./assessment-create-form";
import { releaseRequest } from "./release-request";
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
  const [tab, setTab] = useState("releases");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const editable = viewer.role !== "viewer";
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
              size="small"
            >
              Screens
            </Button>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Stack>
              <Typography variant="overline" color="primary">
                Product overview
              </Typography>
              <Typography variant="h4">{product.board.name}</Typography>
              <Typography color="text.secondary">
                Assess a release through capabilities, dependencies, and
                evidence.
              </Typography>
            </Stack>
            <Button
              component={Link}
              href="/share/demo/releases"
              size="small"
              sx={{ alignSelf: "center" }}
            >
              View example ↗
            </Button>
          </Stack>
          <Tabs
            value={tab}
            onChange={(_, value: string) => setTab(value)}
            variant="scrollable"
            aria-label="Product sections"
          >
            <Tab value="releases" label="Release assessments" />
            <Tab value="capabilities" label="Capabilities" />
            <Tab value="dependencies" label="Components" />
            <Tab value="connections" label="Connections" />
          </Tabs>
          {error && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  onClick={async () => {
                    try {
                      setProduct(
                        await releaseRequest<ProductContext>(
                          `/api/boards/${product.board.id}/product`,
                        ),
                      );
                      setError(null);
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "Unable to reload the product.",
                      );
                    }
                  }}
                >
                  Reload
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {tab === "releases" && (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h6">Release assessments</Typography>
                {editable && (
                  <Button
                    variant="contained"
                    disabled={product.capabilities.every(
                      (item) => item.archivedAt !== null,
                    )}
                    onClick={() => setCreating(true)}
                  >
                    New assessment
                  </Button>
                )}
              </Stack>
              {product.releases.map((release) => (
                <Paper key={release.id} sx={{ p: 2.5 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    gap={2}
                  >
                    <Stack>
                      <Typography variant="h6">
                        {release.candidateLabel}
                      </Typography>
                      <Typography variant="body2">
                        {release.targetEnvironment} · {release.audience}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {release.ownerLabel} · {release.candidateRef}
                      </Typography>
                    </Stack>
                    <Button
                      component={Link}
                      href={`/boards/${product.board.id}/releases/${release.id}`}
                    >
                      Open assessment
                    </Button>
                  </Stack>
                </Paper>
              ))}
              {product.releases.length === 0 && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6">
                    Start with the critical outcomes
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Add capabilities, connect their dependencies, then create a
                    candidate assessment.
                  </Typography>
                  <Button onClick={() => setTab("capabilities")}>
                    View capabilities
                  </Button>
                  <Button component={Link} href="/share/demo/releases">
                    View example ↗
                  </Button>
                </Paper>
              )}
            </Stack>
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
      </Container>
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
