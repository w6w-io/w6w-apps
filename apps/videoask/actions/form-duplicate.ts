import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `POST /forms/{form_id}/duplicate` — copy a form, including its questions,
 * into a (optionally different) folder. Body: `{folder_id}` per the vendor's
 * example.
 */
interface Input {
  formId: string;
  folderId?: string;
  organizationId?: string;
}

const formDuplicate: ActionDefinition<Input> = {
  key: "form-duplicate",
  type: "perform",
  resource: "form",
  title: "Duplicate Form",
  description: "Duplicate a form, including its questions.",
  idempotent: false,
  params: [
    formIdParam,
    { key: "folderId", label: "Destination folder ID", type: "string" },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The new (duplicated) form" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/forms/${encodeId(input.formId)}/duplicate`,
      {
        method: "POST",
        body: compact({ folder_id: input.folderId }),
        organizationId: input.organizationId,
      },
    );
    return { result };
  },
};

export default formDuplicate;
