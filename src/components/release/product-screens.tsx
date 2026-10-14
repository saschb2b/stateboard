"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { AddScreenDialog } from "@/components/screen/add-screen-dialog";
import type { ProductContext } from "@/lib/release-types";
import type { ScreenWithRegions } from "@/lib/types";

export function ProductScreens({
  product,
  editable,
  onScreensAdded,
}: {
  product: ProductContext;
  editable: boolean;
  onScreensAdded: (screens: ScreenWithRegions[]) => void;
}) {
  const t = useTranslations("Product");
  const visual = useTranslations("Visual");
  const [adding, setAdding] = useState(false);
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
        alignItems="flex-start"
      >
        <Stack spacing={0.5}>
          <Typography component="h2" variant="subtitle1">
            {t("screens")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 620 }}
          >
            {t("screensHelp")}
          </Typography>
        </Stack>
        {editable && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAdding(true)}
            sx={{ flexShrink: 0 }}
          >
            {visual("addScreen")}
          </Button>
        )}
      </Stack>
      {product.screens.length ? (
        <ScreenCards product={product} screens={product.screens} />
      ) : (
        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            p: { xs: 2, sm: 3 },
          }}
        >
          <Typography variant="body2">{t("noScreens")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("screensEmptyHelp")}
          </Typography>
        </Box>
      )}
      {adding && (
        <AddScreenDialog
          open
          boardId={product.board.id}
          onClose={() => setAdding(false)}
          onResult={onScreensAdded}
        />
      )}
    </Stack>
  );
}

export function ProductScreenPreview({
  product,
  onViewAll,
}: {
  product: ProductContext;
  onViewAll: () => void;
}) {
  const t = useTranslations("Product");
  if (!product.screens.length) return null;
  return (
    <Stack component="section" aria-label={t("screens")} spacing={1.5}>
      <Stack
        direction="row"
        justifyContent="space-between"
        gap={2}
        alignItems="center"
      >
        <Typography component="h2" variant="subtitle1">
          {t("screens")}
        </Typography>
        <Button
          color="inherit"
          size="small"
          endIcon={<ArrowForwardIcon />}
          onClick={onViewAll}
        >
          {t("viewAllScreens")}
        </Button>
      </Stack>
      <ScreenCards
        product={product}
        screens={product.screens.slice(0, 3)}
        compact
      />
    </Stack>
  );
}

function ScreenCards({
  product,
  screens,
  compact = false,
}: {
  product: ProductContext;
  screens: ScreenWithRegions[];
  compact?: boolean;
}) {
  const t = useTranslations("Product");
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: compact
          ? { md: `repeat(${screens.length}, minmax(0, 1fr))` }
          : {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
        gridAutoFlow: compact ? "column" : undefined,
        gridAutoColumns: compact
          ? {
              xs: screens.length === 1 ? "100%" : "min(78%, 300px)",
              md: "auto",
            }
          : undefined,
        overflowX: compact ? "auto" : undefined,
        pb: compact ? 0.5 : undefined,
        scrollSnapType: compact ? "x proximity" : undefined,
        gap: 2,
      }}
    >
      {screens.map((screen) => {
        const name = screen.label || t("productScreen");
        const regions = new Set(screen.regions.map((region) => region.id));
        const features = new Set(
          product.regionCapabilities
            .filter((link) => regions.has(link.regionId))
            .map((link) => link.capabilityId),
        );
        const descriptionId = `${compact ? "preview" : "gallery"}-screen-${screen.id}`;
        return (
          <Card
            key={screen.id}
            variant="outlined"
            sx={{ minWidth: 0, scrollSnapAlign: compact ? "start" : undefined }}
          >
            <CardActionArea
              component={Link}
              href={`/boards/${product.board.id}?screen=${encodeURIComponent(screen.id)}`}
              aria-label={t("openScreen", { name })}
              aria-describedby={descriptionId}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  bgcolor: "background.default",
                  borderBottom: 1,
                  borderColor: "divider",
                  height: compact ? 144 : { xs: 180, sm: 220 },
                }}
              >
                <Box
                  component="img"
                  src={screen.mediaUrl}
                  alt={name}
                  loading="lazy"
                  sx={{
                    display: "block",
                    height: "100%",
                    width: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
              <Box sx={{ p: 1.5, flex: 1 }}>
                <Typography
                  component="h3"
                  variant="body2"
                  fontWeight={600}
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {name}
                </Typography>
                <Typography
                  id={descriptionId}
                  variant="caption"
                  color="text.secondary"
                  component="p"
                  sx={{ mt: 0.5 }}
                >
                  {t("screenConnections", {
                    regions: regions.size,
                    features: features.size,
                  })}
                </Typography>
              </Box>
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
}
