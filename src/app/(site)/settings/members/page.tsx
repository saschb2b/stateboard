import type { Metadata } from "next";
import { listMembers } from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { MembersAdmin } from "@/components/members-admin";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const me = await requirePageMember("owner");
  const members = await listMembers(me.workspaceId);
  return <MembersAdmin viewer={me} initialMembers={members} />;
}
