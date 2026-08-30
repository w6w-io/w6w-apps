import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  entryId: string;
}

/**
 * DELETE /forms/{formId}/entries/{entryId} — permanently delete an entry. Answers `204 No Content`
 * on success. Requires `Entry:Read/Write/Delete`.
 */
const entryDelete: ActionDefinition<Input> = {
  key: "entry-delete",
  type: "perform",
  resource: "entry",
  title: "Delete Entry",
  description: "Permanently delete a single entry.",
  // Deleting an already-deleted entry converges on the same end state (gone).
  idempotent: true,
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "entryId",
      label: "Entry ID",
      type: "string",
      required: true,
      hint: "Get IDs from a webhook payload, an import result, or another system's own record.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the entry was deleted" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Cognito Forms entry", {
      formId: input.formId,
      entryId: input.entryId,
    });
    await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/entries/${encodeURIComponent(input.entryId)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default entryDelete;
