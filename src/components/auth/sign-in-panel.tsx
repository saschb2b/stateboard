"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LoginIcon from "@mui/icons-material/Login";
import { AppHeader } from "@/components/app/app-header";
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
  return (
    <SignInPanelView
      onSignIn={async () => {
        const result = await authClient.signIn.social({
          provider: "keycloak",
          callbackURL: callback,
        });
        if (result.error)
          throw new Error(
            result.error.message || "Unable to sign in. Try again.",
          );
      }}
    />
  );
}

export function SignInPanelView({
  onSignIn,
}: {
  onSignIn: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const signIn = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await onSignIn();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign in. Try again.",
      );
      setBusy(false);
      inFlight.current = false;
    }
  };

  return (
    <>
      <AppHeader />
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 9 } }}>
        <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: "center" }}>
          <Stack spacing={3} alignItems="center">
            <LockOutlinedIcon sx={{ color: "text.secondary", fontSize: 32 }} />
            <Stack spacing={1}>
              <Typography component="h1" variant="h5">
                Sign in to your workspace
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Use your company account to review products and manage release
                readiness.
              </Typography>
            </Stack>
            <Button
              size="large"
              variant="contained"
              color="primary"
              startIcon={<LoginIcon />}
              onClick={() => void signIn()}
              disabled={busy}
              sx={{ px: 4 }}
            >
              {busy ? "Redirecting…" : "Continue with company account"}
            </Button>
            {error ? (
              <Typography role="alert" variant="body2" color="error">
                {error}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
              Just exploring?{" "}
              <Box
                component={Link}
                href="/share/demo/releases"
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                View an example assessment
              </Box>
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
