import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient } from "../lib/client.ts";
import { DOCTYPE_PARAM, NAME_PARAM } from "../lib/params.ts";

interface Input {
  doctype: string;
  name: string;
  confirm: boolean;
}

/**
 * `DELETE /api/resource/:doctype/:name` — permanently delete a document of
 * any DocType.
 *
 * `idempotent: false`, and the reason is worth stating because the end state
 * looks idempotent. Deleting an already-deleted document does not quietly
 * succeed: Frappe raises `DoesNotExistError`, mapped to HTTP 404 (verified
 * against `frappe/exceptions.py`, `develop` branch, fetched 2026-09-05), so a
 * retry converts a completed deletion into a failed call. A submitted
 * document cannot be deleted at all — it must be cancelled first — and that
 * refusal is surfaced as-is rather than papered over.
 *
 * ERPNext has no trash for most DocTypes, so this requires an explicit
 * confirmation, the same pattern this pack uses for Gitea's repository
 * delete.
 */
const deleteDocument: ActionDefinition<Input> = {
  key: "delete-document",
  type: "perform",
  title: "Delete Document",
  description: "Permanently delete a document of any DocType by its `name`. Submitted documents " +
    "must be cancelled first — Frappe refuses to delete them directly.",
  idempotent: false,
  params: [
    DOCTYPE_PARAM,
    NAME_PARAM,
    {
      key: "confirm",
      label: "I understand this cannot be undone",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Most DocTypes have no trash to recover a deleted document from.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    if (input.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a document cannot be undone");
    }

    ctx.log("warn", "deleting an ERPNext document", { doctype: input.doctype, name: input.name });

    await new ErpNextClient(ctx).resource(
      `/${encodeURIComponent(input.doctype)}/${encodeURIComponent(input.name)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default deleteDocument;
