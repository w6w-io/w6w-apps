import type { ActionDefinition } from "@w6w/types";
import { compact, OBJECT_TYPE, OntraportClient } from "../lib/client.ts";

/**
 * `POST /1/Tags` — create a new tag.
 *
 * A tag name is unique per object type, not globally: two different object
 * types may each have their own tag named "VIP". Creating a duplicate name
 * for the SAME object type fails.
 */
interface Input {
  tagName: string;
  objectTypeId?: number;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a new tag for an object type. Defaults to Contacts.",
  idempotent: false,
  params: [
    { key: "tagName", label: "Tag name", type: "string", required: true },
    {
      key: "objectTypeId",
      label: "Object type ID",
      type: "number",
      default: OBJECT_TYPE.CONTACT,
      advanced: true,
      hint: "0 = Contact (the default if omitted). Custom object type IDs start at 10000.",
    },
  ],
  output: [
    { key: "tag_id", type: "string", label: "Tag ID" },
    { key: "tag_name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Tags", {
      form: compact({ tag_name: input.tagName, object_type_id: input.objectTypeId }),
    });
  },
};

export default tagCreate;
