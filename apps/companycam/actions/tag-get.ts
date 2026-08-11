import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v2/tags/{id}` — one tag.
 *
 * `display_value` is what people see; `value` is its lowercase form, which the
 * vendor documents as the field to search and sort on.
 */
interface Input {
  tagId: string;
}

const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Retrieve Tag",
  description: "Fetch one tag by id.",
  params: [
    { key: "tagId", label: "Tag ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "display_value", type: "string", label: "Display value" },
    { key: "value", type: "string", label: "Normalised value" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/tags/${encodeId(input.tagId)}`);
  },
};

export default tagGet;
