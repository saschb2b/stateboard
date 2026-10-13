import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicReleaseShare } from "@/lib/db";
import { PublicReleaseShare } from "@/components/release/public-release-share";

export const metadata: Metadata = {
  title: "Recorded release review",
  robots: { index: false, follow: false },
};
export default async function PublicReleasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await getPublicReleaseShare(token);
  if (!link) notFound();
  return <PublicReleaseShare projection={link.projection} token={token} />;
}
