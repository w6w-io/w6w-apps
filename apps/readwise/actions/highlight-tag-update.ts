import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { highlightIdParam, tagIdParam, tagNameParam } from "../lib/params.ts";

/** `PATCH /api/v2/highlights/<id>/tags/<tag id>` — rename a tag. */
interface Input {
  highlightId: string;
  tagId: string;
  name: string;
}

const highlightTagUpdate: ActionDefinition<Input> = {
  key: "highlight-tag-update",
  type: "perform",
  resource: "highlight-tag",
  title: "Update Highlight Tag",
  description: "Rename a tag on a highlight.",
  idempotent: true,
  params: [highlightIdParam, tagIdParam, tagNameParam],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(
      `/highlights/${encodeURIComponent(input.highlightId)}/tags/${
        encodeURIComponent(input.tagId)
      }`,
      { method: "PATCH", body: { name: input.name } },
    );
  },
};

export default highlightTagUpdate;
