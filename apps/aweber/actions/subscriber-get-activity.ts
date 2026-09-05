import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import {
  accountIdParam,
  listIdParam,
  paginationParams,
  paginationQuery,
  subscriberIdParam,
} from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists/{listId}/subscribers/{subscriberId}?ws.op=getActivity`
 *
 * A subscriber's event history — subscribed, unsubscribed, tag changes,
 * custom field edits, and more. Every entry carries `type` and `event_time`;
 * the rest of the shape varies by `type`, so this action returns entries
 * as-is rather than projecting a fixed shape onto them.
 */
interface Input {
  accountId: string;
  listId: string;
  subscriberId: string;
  start?: number;
  size?: number;
}

const subscriberGetActivity: ActionDefinition<Input> = {
  key: "subscriber-get-activity",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber Activity",
  description: "Get a subscriber's event history on this list.",
  params: [accountIdParam, listIdParam, subscriberIdParam, ...paginationParams()],
  output: [{ key: "entries", type: "array", label: "Activity entries" }],

  execute(input, ctx) {
    const { accountId, listId, subscriberId } = input;
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/subscribers/${
        encodeId(subscriberId)
      }`,
      { "ws.op": "getActivity", ...paginationQuery(input) },
    );
  },
};

export default subscriberGetActivity;
