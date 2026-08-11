import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { emailParam, listIdParam } from "../lib/params.ts";

/**
 * `POST /api/v3.3/subscribers/{listid}/unsubscribe.json` — unsubscribe one
 * address. **List-level.**
 *
 * The address goes in the **body**, `{"EmailAddress": "…"}`, not the query
 * string — unlike `subscriber-delete`, which is a DELETE with a query
 * parameter. The response is a bare `200 OK`.
 *
 * ## How far this reaches depends on the LIST, not on this call
 *
 * If the list's `UnsubscribeSetting` is `AllClientLists`, unsubscribing here
 * unsubscribes the person from every list of that client and — per the same
 * setting — adds them to the client-wide suppression list. If it is
 * `OnlyThisList`, only this list is affected and the suppression list is not
 * touched. `list-get` reports which one applies.
 *
 * `idempotent: true`: unsubscribing an already-unsubscribed address leaves the
 * same end state.
 */
interface Input {
  listId: string;
  email: string;
}

const subscriberUnsubscribe: ActionDefinition<Input, { EmailAddress: string }> = {
  key: "subscriber-unsubscribe",
  type: "perform",
  resource: "subscriber",
  title: "Unsubscribe Subscriber",
  description:
    "Unsubscribe an address from a list. Whether that also unsubscribes them from the client's " +
    "other lists and adds them to the suppression list is decided by the list's unsubscribe " +
    "setting.",
  idempotent: true,
  params: [listIdParam, emailParam],
  output: [{ key: "EmailAddress", type: "string", label: "Address that was unsubscribed" }],

  async execute(input, ctx) {
    await new CampaignMonitorClient(ctx).json(
      `/subscribers/${encodeId(input.listId)}/unsubscribe`,
      { method: "POST", body: { EmailAddress: input.email } },
    );
    return { EmailAddress: input.email };
  },
};

export default subscriberUnsubscribe;
