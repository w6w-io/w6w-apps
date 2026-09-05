import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
}

/**
 * `GET /frm/v3/forms/{form_id}/fields` — every field on a form.
 *
 * The route table calls out that "Version 3 normalizes supported field-type
 * aliases", i.e. the field `type` a caller reads back may not be byte-for-byte
 * whatever the site originally stored. Permission: "View Forms List".
 */
const fieldGetMany: ActionDefinition<Input> = {
  key: "field-get-many",
  type: "read",
  resource: "field",
  title: "Get Form Fields",
  description: "List every field on a form, with type, label and options.",
  params: [
    { key: "formId", label: "Form ID or Key", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = FormidableClient.fromConnection(ctx);
    return client.request(`/forms/${encodeURIComponent(String(input.formId))}/fields`);
  },
};

export default fieldGetMany;
