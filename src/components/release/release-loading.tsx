import { Container, Paper, Skeleton, Stack } from "@mui/material";
import { AppHeader } from "@/components/app/app-header";

export function ReleaseLoading() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Skeleton width="50%" height={48} />
          <Skeleton width="75%" />
          <Skeleton variant="rounded" height={48} />
          <Paper sx={{ p: 3 }}>
            <Skeleton height={64} />
            <Skeleton />
            <Skeleton />
          </Paper>
          <Skeleton variant="rounded" height={200} />
        </Stack>
      </Container>
    </>
  );
}
