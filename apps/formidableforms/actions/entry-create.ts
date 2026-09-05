import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
  fieldValues: Record<string, unknown>;
}

/**
 * `POST /frm/v3/forms/{form_id}/entries` — write an entry directly.
 *
 * This writes the database row through Formidable's own entry-saving code,
 * but — like the legacy `/frm/v2/entries` route it replaces for new
 * integrations — it is not the form's front-end submission pipeline: it does
 * not run field validation, spam checks, entry limits, or fire the form's own
 * notification / "Send API Data" actions the way a real visitor submission
 * does. There is no separate "run the full submission pipeline" route
 * documented for v3 the way Gravity Forms exposes one; use this action when
 * writing the row itself is the point (imports, back-fills).
 *
 * Field values are keyed by field ID or field key, per the route's
 * `form_id`-and-`field_id`-based addressing scheme used throughout this
 * reference (e.g. Fields, Statistics). The vendor gives no worked example of
 * an entry-creation body for v3 specifically. Permission: "Add Entries from
 * Admin Area".
 */
const entryCreate: ActionDefinition<Input> = {
  key: "entry-create",
  type: "perform",
  resource: "entry",
  title: "Create Entry",
  description: "Write an entry directly into a form.",
  // A fresh entry per POST, with no request key to dedupe on: a retry creates a second entry.
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID or Key", type: "string", required: true },
    {
      key: "fieldValues",
      label: "Field Values",
      type: "json",
      required: true,
      hint: 'Keyed by field ID or field key, e.g. {"25":"Jane","26":"jane@example.com"}. ' +
        "Use Get Form Fields for the IDs.",
    },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating Formidable entry", { formId: input.formId });
    const client = FormidableClient.fromConnection(ctx);
    return client.request(
      `/forms/${encodeURIComponent(String(input.formId))}/entries`,
      { method: "POST", body: { ...(input.fieldValues ?? {}) } },
    );
  },
};

export default entryCreate;
