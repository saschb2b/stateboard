import type { Metadata } from "next";
import { requirePageMember } from "@/lib/auth-helpers";
import { listApiKeys, listWorkspaceApiKeys } from "@/lib/db";
import { ApiKeyManager } from "@/components/workspace/api-key-manager";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  // Any member can mint keys for themselves; each key is capped at the
  // member's own role, so this page needs no role gate beyond membership.
  const me = await requirePageMember("viewer");
  const keys = await listApiKeys(me.workspaceId, me.user.id);
  // Owners additionally see every key in the workspace (governance view).
  const workspaceKeys =
    me.role === "owner" ? await listWorkspaceApiKeys(me.workspaceId) : null;
  return (
    <ApiKeyManager
      viewer={me}
      initialKeys={keys}
      initialWorkspaceKeys={workspaceKeys}
      // Captured once per request so SSR and client hydration render the
      // same expiry labels. The purity rule targets re-renderable client
      // components; this is a request-rendered server component where a
      // request-scoped timestamp is the *fix* for the instability the rule
      // guards against, not an instance of it.
      // eslint-disable-next-line react-hooks/purity
      now={Date.now()}
    />
  );
}
