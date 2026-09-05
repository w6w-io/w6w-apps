import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  entryId: string | number;
  fieldValues: Record<string, unknown>;
}

/**
 * `PATCH /frm/v3/entries/{id}` — update an entry's field values.
 *
 * `PATCH` is used rather than `PUT` so a partial field-value map only touches
 * the fields sent, matching the general "you only need to provide the data
 * you want to change" contract the legacy PATCH/PUT docs describe for this
 * add-on. Permission: "Edit Entries from Admin Area".
 */
const entryUpdate: ActionDefinition<Input> = {
  key: "entry-update",
  type: "perform",
  resource: "entry",
  title: "Update Entry",
  description: "Update one or more field values on an existing entry.",
  idempotent: true,
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
    {
      key: "fieldValues",
      label: "Field Values",
      type: "json",
      required: true,
      hint: 'Keyed by field ID or field key, e.g. {"25":"Jane"}. Only the fields present ' +
        "here are changed.",
    },
  ],

  execute(input, ctx) {
    ctx.log("info", "updating Formidable entry", { entryId: input.entryId });
    const client = FormidableClient.fromConnection(ctx);
    return client.request(
      `/entries/${encodeURIComponent(String(input.entryId))}`,
      { method: "PATCH", body: { ...(input.fieldValues ?? {}) } },
    );
  },
};

export default entryUpdate;
