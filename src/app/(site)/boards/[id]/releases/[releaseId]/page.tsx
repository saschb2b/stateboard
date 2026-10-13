import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageMember } from "@/lib/auth-helpers";
import { readReleaseWorkspace } from "@/lib/db";
import { RELEASE_VIEWS, type ReleaseView } from "@/lib/release-types";
import { ReleaseWorkspace } from "@/components/release/release-workspace";

export const metadata: Metadata = { title: "Release readiness" };
export default async function ReleaseAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; releaseId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const member = await requirePageMember("viewer");
  const { id, releaseId } = await params;
  const [detail, query] = await Promise.all([
    readReleaseWorkspace(releaseId, member.workspaceId),
    searchParams,
  ]);
  if (!detail || detail.assessment.boardId !== id) notFound();
  const view: ReleaseView = RELEASE_VIEWS.includes(query.view as ReleaseView)
    ? (query.view as ReleaseView)
    : "release";
  return (
    <ReleaseWorkspace
      initialProduct={detail.product}
      initialDetail={detail}
      viewer={member}
      initialView={view}
      now={detail.readiness.evaluatedAt}
    />
  );
}
