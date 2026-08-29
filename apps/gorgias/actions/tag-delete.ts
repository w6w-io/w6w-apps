import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";

interface Input {
  tagId: number;
}

/**
 * `DELETE /tags/{id}` — verified against developers.gorgias.com/reference/delete-tag.
 * The vendor's own docs note that tags currently used in macros or rules
 * cannot be deleted (a 4xx from Gorgias, surfaced as-is by `GorgiasClient`).
 */
const tagDelete: ActionDefinition<Input> = {
  key: "tag-delete",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description: "Delete a tag. Any views using it are deactivated.",
  // Deleting an already-deleted tag 404s rather than erroring on a duplicate
  // call, so retrying converges on the same end state.
  idempotent: true,
  params: [
    { key: "tagId", label: "Tag ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new GorgiasClient(ctx).request(`/tags/${input.tagId}`, { method: "DELETE" });
    return {};
  },
};

export default tagDelete;
