import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, listIdParam } from "../lib/params.ts";

/**
 * `DELETE /accounts/{accountId}/lists/{listId}/subscribers?subscriber_email=...`
 *
 * Same hard-delete semantics as `subscriber-delete`, addressed by email.
 */
interface Input {
  accountId: string;
  listId: string;
  email: string;
}

const subscriberDeleteByEmail: ActionDefinition<Input> = {
  key: "subscriber-delete-by-email",
  type: "perform",
  resource: "subscriber",
  title: "Delete Subscriber by Email",
  description: "Permanently delete a subscriber and their activity history, addressed by email.",
  idempotent: true,
  params: [
    accountIdParam,
    listIdParam,
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const res = await new AweberClient(ctx).raw(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/subscribers`,
      { method: "DELETE", query: { subscriber_email: input.email } },
    );
    return { status: res.status };
  },
};

export default subscriberDeleteByEmail;
