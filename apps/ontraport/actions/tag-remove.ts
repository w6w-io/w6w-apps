import type { ActionDefinition } from "@w6w/types";
import { OBJECT_TYPE, OntraportClient } from "../lib/client.ts";

/**
 * `DELETE /1/objects/tagByName` — remove one or more tags, by name, from one
 * or more objects. Nonexistent tag names are ignored rather than failing the
 * whole call.
 */
interface Input {
  objectTypeId?: number;
  ids: string;
  tagNames: string;
}

const tagRemove: ActionDefinition<Input> = {
  key: "tag-remove",
  type: "perform",
  resource: "tag",
  title: "Remove Tags by Name",
  description: "Remove one or more tags, by name, from one or more objects. Nonexistent tag " +
    "names are ignored.",
  idempotent: true,
  params: [
    {
      key: "objectTypeId",
      label: "Object type ID",
      type: "number",
      default: OBJECT_TYPE.CONTACT,
      hint: "0 = Contact (the default). See README.md for the full object type table.",
    },
    { key: "ids", label: "Object IDs", type: "string", required: true, hint: "Comma-separated." },
    {
      key: "tagNames",
      label: "Tag names",
      type: "string",
      required: true,
      hint: "Comma-separated.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Untagged" }],

  async execute(input, ctx) {
    await new OntraportClient(ctx).envelope("/objects/tagByName", {
      method: "DELETE",
      body: {
        objectID: input.objectTypeId ?? OBJECT_TYPE.CONTACT,
        ids: input.ids.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)),
        remove_names: input.tagNames.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    return { ok: true };
  },
};

export default tagRemove;
