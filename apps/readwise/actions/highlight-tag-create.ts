import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { highlightIdParam, tagNameParam } from "../lib/params.ts";

/**
 * `POST /api/v2/highlights/<id>/tags/` — add a tag to a highlight.
 *
 * Unlike Highlight CREATE, the docs state no de-duplication rule for tags, so
 * this is left `idempotent: false` — a repeated call may create a second tag
 * of the same name rather than being a no-op.
 */
interface Input {
  highlightId: string;
  name: string;
}

const highlightTagCreate: ActionDefinition<Input> = {
  key: "highlight-tag-create",
  type: "perform",
  resource: "highlight-tag",
  title: "Create Highlight Tag",
  description: "Add a tag to a highlight.",
  idempotent: false,
  params: [highlightIdParam, { ...tagNameParam, validation: { maxLength: 127 } }],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(
      `/highlights/${encodeURIComponent(input.highlightId)}/tags/`,
      { method: "POST", body: { name: input.name } },
    );
  },
};

export default highlightTagCreate;
