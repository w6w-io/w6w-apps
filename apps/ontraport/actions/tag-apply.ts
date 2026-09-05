import type { ActionDefinition } from "@w6w/types";
import { OBJECT_TYPE, OntraportClient } from "../lib/client.ts";

/**
 * `PUT /1/objects/tagByName` — apply one or more tags, by name, to one or
 * more objects. Creates the tag if it doesn't already exist for the given
 * object type.
 *
 * This is one of only two generic `/objects` endpoints this app calls — tag
 * application is inherently cross-object, so it needs the `objectID`
 * parameter the dedicated `/Tags` endpoints don't.
 */
interface Input {
  objectTypeId?: number;
  ids: string;
  tagNames: string;
}

const tagApply: ActionDefinition<Input> = {
  key: "tag-apply",
  type: "perform",
  resource: "tag",
  title: "Apply Tags by Name",
  description: "Apply one or more tags, by name, to one or more objects. Creates any tag that " +
    "doesn't already exist for the object type.",
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
      hint: "Comma-separated. Each is created if it doesn't already exist for this object type.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Tagged" }],

  async execute(input, ctx) {
    await new OntraportClient(ctx).envelope("/objects/tagByName", {
      method: "PUT",
      body: {
        objectID: input.objectTypeId ?? OBJECT_TYPE.CONTACT,
        ids: input.ids.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)),
        add_names: input.tagNames.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    return { ok: true };
  },
};

export default tagApply;
