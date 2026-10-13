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
import { ProductReleaseList } from "./product-release-list";
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
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Typography variant="h5" component="h1" sx={{ maxWidth: 720 }}>
            {product.board.name}
          </Typography>
          <Tabs
            value={tab}
            onChange={(_, value: string) => setTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="Product sections"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              minHeight: 44,
              "& .MuiTab-root": { minHeight: 44, px: 2, minWidth: 0 },
            }}
          >
            <Tab value="releases" label="Releases" />
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
