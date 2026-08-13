import type { Metadata } from "next";
import { requirePageMember } from "@/lib/auth-helpers";
import { listApiKeys } from "@/lib/db";
import { ApiKeysSettings } from "@/components/api-keys-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  // Any member can mint keys for themselves; each key is capped at the
  // member's own role, so this page needs no role gate beyond membership.
  const me = await requirePageMember("viewer");
  const keys = await listApiKeys(me.workspaceId, me.user.id);
  return <ApiKeysSettings viewer={me} initialKeys={keys} />;
}
