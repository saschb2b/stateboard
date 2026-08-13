import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { AppHeader } from "@/components/app/app-header";

/** Shell for /settings/members while the roster streams in. */
export default function MembersLoading() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box>
            <Skeleton variant="text" width={140} height={44} />
            <Skeleton variant="text" width="80%" />
          </Box>
          <Paper sx={{ overflow: "hidden" }}>
            <Stack
              divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <Stack
                  key={i}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ p: 2 }}
                >
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="30%" />
                    <Skeleton variant="text" width="45%" />
                  </Box>
                  <Skeleton variant="rounded" width={120} height={36} />
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}
