import { ClientShell } from "@/components/client-shell";

/**
 * App layout — wraps the marketing + product routes in the MUI ClientShell
 * (theme, Emotion cache, baseline). The /docs subtree gets a different
 * layout entirely (Fumadocs).
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientShell>{children}</ClientShell>;
}
