import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";

/** Shell for /sign-in while the session check runs. */
export default function SignInLoading() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: "100%", maxWidth: 400 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="rounded" height={44} sx={{ mt: 3 }} />
      </Paper>
    </Box>
  );
}
