import type { ActionDefinition } from "@w6w/types";
import { buildQuery, GetResponseClient } from "../lib/client.ts";

/**
 * `GET /custom-fields` — the account's custom fields.
 *
 * Read this before setting `customFieldValues` on a contact: the payload is
 * keyed by `customFieldId`, and this is the only place those ids and their
 * `valueType` are published. A field's type decides what a value may be, and
 * sending the wrong shape is a validation error rather than a coercion.
 */
interface Input {
  page?: number;
  perPage?: number;
}

const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "search",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "List the account's custom fields — their id, name, type and permitted values. Read this " +
    "before setting custom field values on a contact.",
  params: [
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 1000 },
    },
  ],
  output: [
    { key: "[]", type: "array", label: "Custom fields — `customFieldId` and `valueType`" },
  ],

  execute(input, ctx) {
    return new GetResponseClient(ctx).request("/custom-fields", {
      query: buildQuery({ page: input.page, perPage: input.perPage }),
    });
  },
};

export default customFieldList;
