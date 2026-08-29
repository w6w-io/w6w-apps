import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { highlightIdParam, tagIdParam } from "../lib/params.ts";

/** `GET /api/v2/highlights/<id>/tags/<tag id>` — one tag on one highlight. */
interface Input {
  highlightId: string;
  tagId: string;
}

const highlightTagGet: ActionDefinition<Input> = {
  key: "highlight-tag-get",
  type: "read",
  resource: "highlight-tag",
  title: "Get Highlight Tag",
  description: "Read one tag on a specific highlight.",
  params: [highlightIdParam, tagIdParam],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(
      `/highlights/${encodeURIComponent(input.highlightId)}/tags/${
        encodeURIComponent(input.tagId)
      }`,
    );
  },
};

export default highlightTagGet;
