import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";

/**
 * `PUT /1/Tags` — rename an existing tag. Every object carrying it keeps the
 * tag, under its new name.
 */
interface Input {
  id: string;
  tagName: string;
}

const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Rename Tag",
  description: "Rename an existing tag by ID. Every object with this tag keeps it under the " +
    "new name.",
  idempotent: true,
  params: [
    { key: "id", label: "Tag ID", type: "string", required: true },
    { key: "tagName", label: "New tag name", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "The updated fields" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Tags", {
      method: "PUT",
      form: { id: input.id, tag_name: input.tagName },
    });
  },
};

export default tagUpdate;
