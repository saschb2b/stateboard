import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { AppHeader } from "@/components/app-header";

/** Shell for /settings/audit while the first page of entries streams in. */
export default function AuditLoading() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box>
            <Skeleton variant="text" width={160} height={44} />
            <Skeleton variant="text" width="70%" />
          </Box>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="text" width="100%" height={32} />
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}
