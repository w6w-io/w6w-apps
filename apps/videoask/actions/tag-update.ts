import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, tagIdParam } from "../lib/params.ts";

/** `PATCH /tags/{tag_id}` — rename a tag. Body: `{"title": "..."}`. */
interface Input {
  tagId: string;
  title: string;
  organizationId?: string;
}

const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description: "Rename a tag.",
  idempotent: true,
  params: [
    tagIdParam,
    { key: "title", label: "Title", type: "string", required: true },
    organizationIdParam,
  ],
  output: [
    { key: "tag_id", type: "string", label: "Tag ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).entity(`/tags/${encodeId(input.tagId)}`, {
      method: "PATCH",
      body: { title: input.title },
      organizationId: input.organizationId,
    });
  },
};

export default tagUpdate;
