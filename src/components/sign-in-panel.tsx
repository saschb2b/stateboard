"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LoginIcon from "@mui/icons-material/Login";
import { AppHeader } from "./app-header";
import { authClient } from "@/lib/auth-client";

interface SignInPanelProps {
  callback: string;
}

/**
 * Single sign-in surface.
 *
 * The instance is configured with one Keycloak realm via env — there is
 * no provider picker, just one button that kicks off the OIDC flow.
 * If the operator wants more providers in the future, this is the place
 * to render multiple buttons.
 */
export function SignInPanel({ callback }: SignInPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await authClient.signIn.oauth2({
        providerId: "keycloak",
        callbackURL: callback,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader />
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
        <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: "center" }}>
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                width: 28,
                height: 28,
                bgcolor: "primary.main",
                borderRadius: 0.5,
              }}
            />
            <Stack spacing={1}>
              <Typography variant="h4">Sign in to StateBoard</Typography>
              <Typography variant="body1" color="text.secondary">
                Authentication runs through your company&apos;s Keycloak realm.
                Editors and owners create boards; viewers can read them. Public
                share links work without signing in.
              </Typography>
            </Stack>
            <Button
              size="large"
              variant="contained"
              color="primary"
              startIcon={<LoginIcon />}
              onClick={onSignIn}
              disabled={busy}
              sx={{ px: 4 }}
            >
              {busy ? "Redirecting…" : "Continue with Keycloak"}
            </Button>
            {error ? (
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
              No account?{" "}
              <Box
                component={Link}
                href="/share/demo"
                target="_blank"
                rel="noopener"
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                See the example board ↗ <OpenInNewIcon fontSize="inherit" />
              </Box>
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
