import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, listIdParam, subscriberIdParam } from "../lib/params.ts";

/**
 * `DELETE /accounts/{accountId}/lists/{listId}/subscribers/{subscriberId}`.
 *
 * This is a hard delete, not an unsubscribe: AWeber's own note is that a
 * deleted subscriber's analytics activity is removed from the account too,
 * and any of their past clicks/opens show up afterward as "Deleted
 * Subscriber". To unsubscribe without losing that history, use
 * `subscriber-update` with status `unsubscribed` instead.
 */
interface Input {
  accountId: string;
  listId: string;
  subscriberId: string;
}

const subscriberDelete: ActionDefinition<Input> = {
  key: "subscriber-delete",
  type: "perform",
  resource: "subscriber",
  title: "Delete Subscriber",
  description:
    "Permanently delete a subscriber and their activity history. To just unsubscribe them " +
    "(keeping history), use Update Subscriber with status unsubscribed instead.",
  idempotent: true,
  params: [accountIdParam, listIdParam, subscriberIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const { accountId, listId, subscriberId } = input;
    const res = await new AweberClient(ctx).raw(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/subscribers/${
        encodeId(subscriberId)
      }`,
      { method: "DELETE" },
    );
    return { status: res.status };
  },
};

export default subscriberDelete;
