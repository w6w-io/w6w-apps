import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `POST /inboxes/{inboxId}/schema` — create or replace an inbox's extraction
 * schema, which defines what data Airparser pulls out of every document
 * uploaded to that inbox.
 *
 * `fields` is a free-form JSON array rather than a generated form: each entry
 * is one of four documented shapes (`scalar`, `list`, `object`, `enum`), and
 * `list`/`object` fields nest their own `attributes` arrays recursively — a
 * structure this app renders as `type: "json"` rather than reconstructing as
 * a deeply nested form. See the vendor's docs for the full shape of each
 * field type and its validation rules (field names must start with a
 * lowercase letter and contain only lowercase letters, numbers and
 * underscores; max 100 chars; unique within their scope; enum values 1–100
 * chars each).
 *
 * **The response is a bare boolean**, not an object — see `lib/client.ts`.
 * This action returns `{ updated: <bool> }` so a workflow gets a named field.
 */
interface Input {
  inboxId: string;
  fields: unknown[];
}

const schemaUpdate: ActionDefinition<Input, { updated: boolean }> = {
  key: "schema-update",
  type: "perform",
  resource: "schema",
  title: "Create or Update Extraction Schema",
  description:
    "Create or replace an inbox's extraction schema. `fields` is a JSON array of scalar/list/" +
    "object/enum field definitions — see the vendor's docs for the exact shape of each.",
  idempotent: true,
  params: [
    { key: "inboxId", label: "Inbox", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Array of field definitions ({type: scalar|list|object|enum, data: {...}}). Field " +
        "names: lowercase letters, digits and underscores only, unique within scope, max 100 chars.",
    },
  ],
  output: [
    { key: "updated", type: "boolean", label: "Schema was updated" },
  ],

  async execute(input, ctx) {
    const updated = await new AirparserClient(ctx).request<boolean>(
      `/inboxes/${encodeURIComponent(input.inboxId)}/schema`,
      { method: "POST", body: { fields: input.fields } },
    );
    return { updated: updated === true };
  },
};

export default schemaUpdate;
