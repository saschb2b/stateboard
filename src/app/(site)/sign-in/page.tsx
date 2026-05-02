import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignInPanel } from "@/components/sign-in-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to StateBoard with your Keycloak account.",
};

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  // If already signed in, jump straight to /boards (or wherever the
  // user was originally heading before middleware bounced them).
  const session = await auth.api.getSession({ headers: await headers() });
  const { from } = await searchParams;
  const callback = from && from.startsWith("/") ? from : "/boards";
  if (session?.user) redirect(callback);

  return <SignInPanel callback={callback} />;
}
