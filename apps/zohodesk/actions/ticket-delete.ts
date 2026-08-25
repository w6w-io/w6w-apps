import type { ActionDefinition } from "@w6w/types";
import { type DeskDeleteInput, deskMoveToTrash } from "../lib/desk.ts";
import { deleteOutput, orgId, recordId } from "../lib/params.ts";

/**
 * Zoho Desk has no single-ticket DELETE — only `POST /tickets/moveToTrash`
 * with an array of ids, answering `204 No Content` (verified 2026-08-25).
 * This wraps the single id into that array.
 */
const ticketDelete: ActionDefinition<DeskDeleteInput> = {
  key: "ticket-delete",
  type: "perform",
  resource: "ticket",
  title: "Delete Ticket",
  description: "Move a ticket to trash.",
  idempotent: true,
  params: [recordId, orgId],
  output: deleteOutput,

  execute(input, ctx) {
    return deskMoveToTrash(ctx, "/tickets", "ticketIds", input);
  },
};

export default ticketDelete;
