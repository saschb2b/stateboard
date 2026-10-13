import { mutateProduct, readWorkspaceComponents } from "@/lib/db";
import { releaseApi } from "@/lib/release-api";
import { ReleaseError } from "@/lib/release-types";

export async function GET(request: Request) {
  return releaseApi(request, {}, async ({ member }) =>
    readWorkspaceComponents(member.workspaceId),
  );
}
export async function POST(request: Request) {
  return releaseApi(
    request,
    { created: true },
    async ({ member, actor, body }) => {
      if (typeof body.boardId !== "string")
        throw new ReleaseError(
          400,
          "boardId is required for the product context",
        );
      return mutateProduct(
        member.workspaceId,
        body.boardId,
        { type: "component.create", data: body },
        actor,
      );
    },
  );
}
