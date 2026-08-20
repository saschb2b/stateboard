import type { Metadata } from "next";
import { listMembers } from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { MemberRoster } from "@/components/workspace/member-roster";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const me = await requirePageMember("owner");
  const members = await listMembers(me.workspaceId);
  return <MemberRoster viewer={me} initialMembers={members} />;
}
