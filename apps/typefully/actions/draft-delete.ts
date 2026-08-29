import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { draftIdParam, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  draftId: number;
}

/**
 * `DELETE /v2/social-sets/{social_set_id}/drafts/{draft_id}` — delete a draft
 * in any status (draft, error, scheduled, published, publishing) with WRITE
 * access. Answers `204 No Content`.
 *
 * `idempotent: true` — deleting an already-deleted draft answers `404
 * NOT_FOUND` rather than corrupting anything, so a retry after a dropped
 * response is safe.
 */
const draftDelete: ActionDefinition<Input> = {
  key: "draft-delete",
  type: "perform",
  resource: "draft",
  title: "Delete Draft",
  description: "Delete a draft.",
  idempotent: true,
  params: [socialSetIdParam, draftIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204)" }],

  async execute(input, ctx) {
    const status = await new TypefullyClient(ctx).status(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}`,
      { method: "DELETE" },
    );
    ctx.log("info", "deleted Typefully draft", { draftId: input.draftId });
    return { status };
  },
};

export default draftDelete;
