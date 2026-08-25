import type { ActionDefinition } from "@w6w/types";
import { type DeskDeleteInput, deskMoveToTrash } from "../lib/desk.ts";
import { deleteOutput, orgId, recordId } from "../lib/params.ts";

/**
 * Zoho Desk has no single-account DELETE — only `POST /accounts/moveToTrash`
 * with an array of ids, answering `204 No Content` (verified 2026-08-25).
 */
const accountDelete: ActionDefinition<DeskDeleteInput> = {
  key: "account-delete",
  type: "perform",
  resource: "account",
  title: "Delete Account",
  description: "Move an account (customer company) to trash.",
  idempotent: true,
  params: [recordId, orgId],
  output: deleteOutput,

  execute(input, ctx) {
    return deskMoveToTrash(ctx, "/accounts", "accountIds", input);
  },
};

export default accountDelete;
