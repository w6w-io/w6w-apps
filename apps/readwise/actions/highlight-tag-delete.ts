import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { highlightIdParam, tagIdParam } from "../lib/params.ts";

/** `DELETE /api/v2/highlights/<id>/tags/<tag id>` — status `204`, no body. */
interface Input {
  highlightId: string;
  tagId: string;
}

const highlightTagDelete: ActionDefinition<Input> = {
  key: "highlight-tag-delete",
  type: "perform",
  resource: "highlight-tag",
  title: "Delete Highlight Tag",
  description: "Remove a tag from a highlight.",
  idempotent: true,
  params: [highlightIdParam, tagIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new ReadwiseClient(ctx).status(
      `/highlights/${encodeURIComponent(input.highlightId)}/tags/${
        encodeURIComponent(input.tagId)
      }`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default highlightTagDelete;
