import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
  styleId: string | number;
}

/**
 * `POST /frm/v3/form-styles/{form_id}` — assign a style to a form.
 *
 * Documented with a worked example: `{"style_id": 12}` against
 * `/form-styles/25`. Requires "Add and Edit Forms".
 */
const formStyleAssign: ActionDefinition<Input> = {
  key: "form-style-assign",
  type: "perform",
  resource: "form",
  title: "Assign Style to Form",
  description: "Set which style a form uses.",
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID or Key", type: "string", required: true },
    {
      key: "styleId",
      label: "Style ID",
      type: "string",
      required: true,
      hint: "From Get Many Styles.",
    },
  ],

  execute(input, ctx) {
    ctx.log("info", "assigning style to Formidable form", {
      formId: input.formId,
      styleId: input.styleId,
    });
    const client = FormidableClient.fromConnection(ctx);
    return client.request(`/form-styles/${encodeURIComponent(String(input.formId))}`, {
      method: "POST",
      body: { style_id: input.styleId },
    });
  },
};

export default formStyleAssign;
