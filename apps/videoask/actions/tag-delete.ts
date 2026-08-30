import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, tagIdParam } from "../lib/params.ts";

/** `DELETE /tags/{tag_id}` — delete a tag account-wide. */
interface Input {
  tagId: string;
  organizationId?: string;
}

const tagDelete: ActionDefinition<Input> = {
  key: "tag-delete",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description: "Delete a tag.",
  idempotent: true,
  params: [tagIdParam, organizationIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new VideoAskClient(ctx).status(`/tags/${encodeId(input.tagId)}`, {
      method: "DELETE",
      organizationId: input.organizationId,
    });
    return { status };
  },
};

export default tagDelete;
