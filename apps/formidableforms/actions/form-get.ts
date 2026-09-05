import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
}

/**
 * `GET /frm/v3/forms/{id}` — one form. The reference notes that "IDs can be
 * numeric IDs or form keys where the schema permits", so this action accepts
 * either verbatim. Permission: "View Forms List".
 */
const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch one form by its numeric ID or form key.",
  params: [
    {
      key: "formId",
      label: "Form ID or Key",
      type: "string",
      required: true,
      hint: "The ID or Key column under Formidable -> Forms, or from Get Many Forms.",
    },
  ],

  execute(input, ctx) {
    const client = FormidableClient.fromConnection(ctx);
    return client.request(`/forms/${encodeURIComponent(String(input.formId))}`);
  },
};

export default formGet;
