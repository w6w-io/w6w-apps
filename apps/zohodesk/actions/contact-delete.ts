import type { ActionDefinition } from "@w6w/types";
import { type DeskDeleteInput, deskMoveToTrash } from "../lib/desk.ts";
import { deleteOutput, orgId, recordId } from "../lib/params.ts";

/**
 * Zoho Desk has no single-contact DELETE — only `POST /contacts/moveToTrash`
 * with an array of ids, answering `204 No Content` (verified 2026-08-25).
 */
const contactDelete: ActionDefinition<DeskDeleteInput> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Move a contact to trash.",
  idempotent: true,
  params: [recordId, orgId],
  output: deleteOutput,

  execute(input, ctx) {
    return deskMoveToTrash(ctx, "/contacts", "contactIds", input);
  },
};

export default contactDelete;
