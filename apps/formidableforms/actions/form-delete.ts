import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
  confirm: boolean;
}

/**
 * `DELETE /frm/v3/forms/{id}` — permanently delete a form and, per the legacy
 * `/frm/v2` docs for the same underlying operation, everything under it.
 * The reference gives no undo path and explicitly says "Destructive examples
 * are not included here. Test deletion and recovery on staging before
 * production use." — `confirm` exists so this cannot fire by an unattended
 * default. Permission: "Delete Forms".
 */
const formDelete: ActionDefinition<Input> = {
  key: "form-delete",
  type: "perform",
  resource: "form",
  title: "Delete Form",
  description: "Permanently delete a form. There is no trash to recover it from.",
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID or Key", type: "string", required: true },
    {
      key: "confirm",
      label: "I understand this is permanent",
      type: "boolean",
      required: true,
      default: false,
    },
  ],

  execute(input, ctx) {
    if (!input.confirm) {
      throw new Error("form-delete requires confirm: true — this permanently deletes the form");
    }
    ctx.log("warn", "deleting Formidable form", { formId: input.formId });
    const client = FormidableClient.fromConnection(ctx);
    return client.request(`/forms/${encodeURIComponent(String(input.formId))}`, {
      method: "DELETE",
    });
  },
};

export default formDelete;
