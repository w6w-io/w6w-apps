import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  entryId: string | number;
  confirm: boolean;
}

/**
 * `DELETE /frm/v3/entries/{id}` — permanently delete an entry. The reference
 * gives no undo path ("Test deletion and recovery on staging before
 * production use") — `confirm` exists so this cannot fire by an unattended
 * default. Permission: "Delete Entries from Admin Area".
 */
const entryDelete: ActionDefinition<Input> = {
  key: "entry-delete",
  type: "perform",
  resource: "entry",
  title: "Delete Entry",
  description: "Permanently delete an entry.",
  idempotent: true,
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
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
      throw new Error("entry-delete requires confirm: true — this permanently deletes the entry");
    }
    ctx.log("warn", "deleting Formidable entry", { entryId: input.entryId });
    const client = FormidableClient.fromConnection(ctx);
    return client.request(`/entries/${encodeURIComponent(String(input.entryId))}`, {
      method: "DELETE",
    });
  },
};

export default entryDelete;
