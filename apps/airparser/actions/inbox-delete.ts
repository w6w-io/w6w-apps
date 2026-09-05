import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `DELETE /inboxes/{inboxId}` — delete an inbox. Deletes its documents and
 * extraction schema along with it; the docs give no separate confirmation
 * step or soft-delete window.
 *
 * Marked idempotent: retrying a delete does not compound — there is nothing
 * left to delete a second time, so a retry either repeats the same success
 * or gets a "not found" for an inbox that is already gone, never a second
 * side effect.
 */
interface Input {
  inboxId: string;
}

const inboxDelete: ActionDefinition<Input, { deleted: true }> = {
  key: "inbox-delete",
  type: "perform",
  resource: "inbox",
  title: "Delete Inbox",
  description: "Delete an inbox, including its documents and extraction schema. There is no undo.",
  idempotent: true,
  params: [
    { key: "inboxId", label: "Inbox", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new AirparserClient(ctx).request<unknown>(
      `/inboxes/${encodeURIComponent(input.inboxId)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default inboxDelete;
