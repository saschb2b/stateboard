"use client";
import { useTranslations } from "next-intl";
import {
  Box,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { AppHeader } from "@/components/app/app-header";

export default function BoardsLoading() {
  const t = useTranslations("Common");
  return (
    <>
      <AppHeader homeHref="/boards" crumb={t("workspace")} />
      <Container
        component="main"
        maxWidth="lg"
        sx={{ py: { xs: 3, md: 4 } }}
        aria-busy="true"
        aria-label={t("loadingBoards")}
      >
        <Box sx={{ mb: 3 }}>
          <Typography component="h1" variant="h5">
            {t("boards")}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {t("boardsDescription")}
          </Typography>
        </Box>
        <Paper sx={{ overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.25 }}>
            <Skeleton width={80} />
          </Box>
          {Array.from({ length: 3 }, (_, index) => (
            <Stack
              key={index}
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              sx={{ p: 2.5, borderTop: 1, borderColor: "divider" }}
            >
              <Box sx={{ flex: 1 }}>
                <Skeleton width="65%" height={32} />
                <Skeleton width="90%" />
                <Skeleton width={90} sx={{ mt: 1 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Skeleton width="65%" />
                <Skeleton width="85%" />
                <Skeleton width="50%" />
              </Box>
              <Skeleton variant="rounded" width={136} height={36} />
            </Stack>
          ))}
        </Paper>
      </Container>
    </>
  );
}
