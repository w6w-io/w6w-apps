import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient } from "../lib/client.ts";

/**
 * `POST /v2/tags` — create a tag in the company's vocabulary.
 *
 * Body nests: `{"tag": {"display_value": "…"}}`. The lowercase `value` is
 * derived server-side and cannot be set.
 *
 * Creating a tag here is rarely necessary — `photo-tag-add` and
 * `project-label-add` create unknown values on the fly. Use this when the tag
 * must exist before anything is tagged, e.g. to seed a vocabulary.
 *
 * Not idempotent: the vendor documents no uniqueness constraint on
 * `display_value`, so a retry may leave two tags reading the same.
 */
interface Input {
  displayValue: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag by display value. The normalised value is derived server-side.",
  idempotent: false,
  params: [
    {
      key: "displayValue",
      label: "Display value",
      type: "string",
      required: true,
      hint: "What people see. The lowercase search value is derived from it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "display_value", type: "string", label: "Display value" },
    { key: "value", type: "string", label: "Normalised value" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json("/tags", {
      method: "POST",
      body: { tag: { display_value: input.displayValue } },
    });
  },
};

export default tagCreate;
