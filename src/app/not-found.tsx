import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { AppHeader } from "@/components/app-header";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>
            404
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            That board doesn&apos;t exist, or its share link was rotated.
          </Typography>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary">
              Back to boards
            </Button>
          </Link>
        </Box>
      </Container>
    </>
  );
}
