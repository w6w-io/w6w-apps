import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `POST /forms/{form_id}/restore` — undelete a form previously removed with
 * Delete Form's `soft_delete=true` (the default). Body: `{folder_id}` per the
 * vendor's example, presumably to re-home it if its original folder is gone.
 */
interface Input {
  formId: string;
  folderId?: string;
  organizationId?: string;
}

const formRestore: ActionDefinition<Input> = {
  key: "form-restore",
  type: "perform",
  resource: "form",
  title: "Restore Form",
  description: "Restore a soft-deleted form.",
  idempotent: true,
  params: [
    formIdParam,
    { key: "folderId", label: "Destination folder ID", type: "string" },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The restored form" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/forms/${encodeId(input.formId)}/restore`,
      {
        method: "POST",
        body: compact({ folder_id: input.folderId }),
        organizationId: input.organizationId,
      },
    );
    return { result };
  },
};

export default formRestore;
