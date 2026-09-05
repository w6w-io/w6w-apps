import type { ActionDefinition } from "@w6w/types";
import { compactBody, FormidableClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  status?: string;
  options?: Record<string, unknown>;
}

/**
 * `POST /frm/v3/forms` — create a form.
 *
 * The reference names `form name, description, status, options, and
 * supported fields` as the write inputs for this route, without a worked
 * example. This action sends the three concretely-named scalar properties
 * (`name`, `description`, `status`) and an optional raw `options` object for
 * anything else the site's schema accepts; it does not attempt to create
 * fields in the same call — see `form-get` after creating to confirm the
 * result, and use `field-get-many` on an existing form to see the field
 * schema this add-on returns. Permission: "Add and Edit Forms".
 */
const formCreate: ActionDefinition<Input> = {
  key: "form-create",
  type: "perform",
  resource: "form",
  title: "Create Form",
  description: "Create a new, empty form (no fields).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The WordPress post status backing the form, e.g. `publish` or `draft`. The " +
        "reference names `status` as a write input but does not enumerate its accepted " +
        "values for forms specifically — leave blank to accept the site's default.",
    },
    {
      key: "options",
      label: "Options",
      type: "json",
      hint: "Raw form options object, for settings not exposed above. Sent as-is.",
    },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating Formidable form", { name: input.name });
    const client = FormidableClient.fromConnection(ctx);
    const body = compactBody({
      name: input.name,
      description: input.description,
      status: input.status,
      options: input.options,
    });
    return client.request("/forms", { method: "POST", body });
  },
};

export default formCreate;
