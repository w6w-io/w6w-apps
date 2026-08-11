import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { emailParam, listIdParam } from "../lib/params.ts";

/**
 * `DELETE /api/v3.3/subscribers/{listid}.json?email={email}` — delete one
 * subscriber from a list. **List-level.**
 *
 * "Delete" here means *state change*, not erasure: the vendor's words are
 * "Changes the status of an Active Subscriber to a Deleted Subscriber", and the
 * record is still readable through `subscriber-get` and through
 * `list-subscribers-get` with state `deleted`. It is not a GDPR erasure.
 *
 * The difference from `subscriber-unsubscribe` is what happens next: "This will
 * **not** result in the subscriber's email address being added to the
 * suppression list." A deleted subscriber can be added again; an unsubscribed
 * one on an `AllClientLists` list generally cannot without `Resubscribe`.
 *
 * `idempotent: true` — deleting an already-deleted subscriber leaves the same
 * state.
 */
interface Input {
  listId: string;
  email: string;
}

const subscriberDelete: ActionDefinition<Input, { EmailAddress: string }> = {
  key: "subscriber-delete",
  type: "perform",
  resource: "subscriber",
  title: "Delete Subscriber",
  description:
    "Move a subscriber to the Deleted state on one list. The record remains readable and the " +
    "address is NOT added to the suppression list.",
  idempotent: true,
  params: [listIdParam, emailParam],
  output: [{ key: "EmailAddress", type: "string", label: "Address that was deleted" }],

  async execute(input, ctx) {
    await new CampaignMonitorClient(ctx).json(
      `/subscribers/${encodeId(input.listId)}`,
      { method: "DELETE", query: { email: input.email } },
    );
    return { EmailAddress: input.email };
  },
};

export default subscriberDelete;
