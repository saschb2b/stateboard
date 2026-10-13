import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { AppHeader } from "@/components/app/app-header";
import { SiteLink } from "@/components/site/site-link";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <Container
        component="main"
        maxWidth="sm"
        sx={{ py: { xs: 6, md: 10 }, textAlign: "center" }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            404
          </Typography>
          <Typography component="h1" variant="h5" sx={{ mb: 1 }}>
            Page not found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            This page is unavailable, or its share link was revoked.
          </Typography>
          <SiteLink href="/" variant="contained" color="primary">
            Back to StateBoard
          </SiteLink>
        </Box>
      </Container>
    </>
  );
}
