import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `DELETE /documents/{uuid}/` — 204 No Content on success.
 *
 * Deleting only makes the document unavailable to the sender immediately. Per SignRequest's own
 * docs, signers without a registered account get a grace period to download the signed copy before
 * the document is fully deleted for everyone.
 *
 * Not idempotent: a retry against an id already deleted (this call's own success, or someone
 * else's) answers `404`, which this action surfaces as a failure rather than a second success.
 */
const documentDelete: ActionDefinition<Input> = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete Document",
  description: "Delete a document (immediately for the sender; a grace period applies to signers).",
  idempotent: false,
  params: [documentIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new SignRequestClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}/`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default documentDelete;
