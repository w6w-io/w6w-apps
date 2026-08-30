import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `DELETE /forms/{form_id}?soft_delete=true|false` — the vendor's own
 * collection variable defaults `soft_delete` to `"true"`, and the response
 * carries no body in the captured example (assumed `204`). A soft delete can
 * be undone with Restore Form; a hard delete cannot.
 */
interface Input {
  formId: string;
  softDelete?: boolean;
  organizationId?: string;
}

const formDelete: ActionDefinition<Input> = {
  key: "form-delete",
  type: "perform",
  resource: "form",
  title: "Delete Form",
  description: "Delete a form. Soft-deleted forms can be restored with Restore Form.",
  idempotent: true,
  params: [
    formIdParam,
    {
      key: "softDelete",
      label: "Soft delete",
      type: "boolean",
      default: true,
      hint: "If true (the vendor's own default), the form can later be recovered with Restore " +
        "Form. If false, deletion is permanent.",
    },
    organizationIdParam,
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new VideoAskClient(ctx).status(`/forms/${encodeId(input.formId)}`, {
      method: "DELETE",
      query: { soft_delete: input.softDelete ?? true },
      organizationId: input.organizationId,
    });
    return { status };
  },
};

export default formDelete;
