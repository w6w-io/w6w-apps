import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `PUT /v2/tags/{id}` — rename a tag.
 *
 * This renames the tag **everywhere it is used** — every photo and project
 * carrying it. There is no per-photo rename. The documented success status is
 * `201`.
 *
 * Idempotent: it sets one string to a stated value.
 */
interface Input {
  tagId: string;
  displayValue: string;
}

const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description: "Rename a tag. The change applies everywhere the tag is used.",
  idempotent: true,
  params: [
    { key: "tagId", label: "Tag ID", type: "string", required: true },
    { key: "displayValue", label: "Display value", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "display_value", type: "string", label: "Display value" },
    { key: "value", type: "string", label: "Normalised value" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/tags/${encodeId(input.tagId)}`, {
      method: "PUT",
      body: { tag: { display_value: input.displayValue } },
    });
  },
};

export default tagUpdate;
