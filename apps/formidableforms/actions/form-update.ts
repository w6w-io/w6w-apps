import type { ActionDefinition } from "@w6w/types";
import { compactBody, FormidableClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
  name?: string;
  description?: string;
  status?: string;
  options?: Record<string, unknown>;
}

/**
 * `PUT` or `PATCH /frm/v3/forms/{id}` — update a form.
 *
 * The route table lists both `PUT` and `PATCH` for this route with no
 * documented difference in Formidable's own words (unlike, e.g., Mautic's
 * PUT-replaces-vs-PATCH-merges split). This action uses `PATCH`, the more
 * conservative of the two verbs generally, and sends only the fields the
 * caller set. Permission: "Add and Edit Forms".
 */
const formUpdate: ActionDefinition<Input> = {
  key: "form-update",
  type: "perform",
  resource: "form",
  title: "Update Form",
  description: "Update a form's name, description, status, or raw options.",
  // Re-sending the same fields produces the same stored state.
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID or Key", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The WordPress post status backing the form, e.g. `publish` or `draft`.",
    },
    {
      key: "options",
      label: "Options",
      type: "json",
      hint: "Raw form options object. Sent as-is, replacing what's provided.",
    },
  ],

  execute(input, ctx) {
    ctx.log("info", "updating Formidable form", { formId: input.formId });
    const client = FormidableClient.fromConnection(ctx);
    const body = compactBody({
      name: input.name,
      description: input.description,
      status: input.status,
      options: input.options,
    });
    return client.request(`/forms/${encodeURIComponent(String(input.formId))}`, {
      method: "PATCH",
      body,
    });
  },
};

export default formUpdate;
