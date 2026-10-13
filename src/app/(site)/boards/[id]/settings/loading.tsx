import { Box, Container, Skeleton, Stack, Typography } from "@mui/material";
import { AppHeader } from "@/components/app/app-header";

export default function BoardSettingsLoading() {
  return (
    <>
      <AppHeader />
      <Container
        component="main"
        maxWidth="lg"
        sx={{ py: { xs: 3, md: 4 } }}
        aria-busy="true"
        aria-label="Loading board settings"
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Board settings
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
          <Box sx={{ width: { sm: 184 }, flexShrink: 0 }}>
            <Skeleton width="80%" />
            <Skeleton variant="rounded" height={36} sx={{ mt: 1 }} />
          </Box>
          <Stack spacing={2} sx={{ flex: 1, maxWidth: 720 }}>
            <Skeleton width={180} height={32} />
            <Skeleton width="75%" />
            <Skeleton variant="rounded" height={40} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" width={120} height={36} />
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
