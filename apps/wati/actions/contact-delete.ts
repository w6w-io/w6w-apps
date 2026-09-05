import type { ActionDefinition } from "@w6w/types";
import { WatiClient } from "../lib/client.ts";
import { CONTACT_TARGET_PARAM } from "../lib/params.ts";

interface Input {
  target: string;
}

interface DeleteContactResponse {
  contact_id?: string;
  deleted?: boolean;
  cleanup_completed?: boolean;
}

/**
 * `DELETE /api/ext/v3/contacts/{target}` — verified against the embedded OpenAPI document
 * 2026-09-05. The operation's own summary states this is a SOFT delete via "Wati's existing
 * production deletion flow" — "not a physical GDPR erasure."
 *
 * Marked idempotent: deleting an already-deleted (or nonexistent) target is safe to retry — it
 * either reports `deleted: false`/a 404 or repeats the same soft-delete outcome, never a
 * duplicate side effect.
 */
const action: ActionDefinition<Input, DeleteContactResponse> = {
  key: "contact-delete",
  type: "perform",
  resource: "contacts",
  title: "Delete Contact",
  description: "Soft-delete a contact (Wati's own production deletion flow — not a GDPR erasure).",
  idempotent: true,
  params: [CONTACT_TARGET_PARAM],
  output: [
    { key: "contact_id", label: "Contact ID", type: "string" },
    { key: "deleted", label: "Deleted", type: "boolean" },
    { key: "cleanup_completed", label: "Cleanup Completed", type: "boolean" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Wati contact", { target: input.target });
    return await new WatiClient(ctx).delete<DeleteContactResponse>(
      `/contacts/${encodeURIComponent(input.target)}`,
    );
  },
};

export default action;
