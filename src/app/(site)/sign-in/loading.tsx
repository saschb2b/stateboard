import { Container, Paper, Skeleton, Stack } from "@mui/material";
import { AppHeader } from "@/components/app/app-header";

export default function SignInLoading() {
  return (
    <>
      <AppHeader />
      <Container
        component="main"
        maxWidth="sm"
        sx={{ py: { xs: 5, md: 9 } }}
        aria-busy="true"
        aria-label="Loading sign-in"
      >
        <Paper sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={3} alignItems="center">
            <Skeleton variant="rounded" width={32} height={32} />
            <Skeleton width="85%" height={36} />
            <Skeleton width="100%" />
            <Skeleton variant="rounded" width="85%" height={44} />
            <Skeleton width="75%" />
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
