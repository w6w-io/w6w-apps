import type { ActionDefinition } from "@w6w/types";
import { SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `DELETE /document/{document_id}` — deletes a document from the account.
 *
 * Not idempotent: deleting an id that no longer exists is SignNow's own
 * not-found error, not a repeat of the same success — a retry after a
 * network timeout cannot tell "already deleted" from "never existed" without
 * a prior read.
 */
const documentDelete: ActionDefinition<Input> = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete Document",
  description: "Permanently delete a document from the account.",
  idempotent: false,
  params: [documentIdParam],
  output: [{ key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    return new SignNowClient(ctx).request(`/document/${encodeURIComponent(input.documentId)}`, {
      method: "DELETE",
    });
  },
};

export default documentDelete;
