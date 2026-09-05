import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, broadcastIdParam, listIdParam } from "../lib/params.ts";

/**
 * `POST /accounts/{accountId}/lists/{listId}/broadcasts/{broadcastId}/cancel`
 * — cancel a scheduled (not yet sent) broadcast. Answers `200` with just
 * `{"self_link": "..."}`. A broadcast that has already started sending
 * answers `409` (`BroadcastSchedulingError`).
 */
interface Input {
  accountId: string;
  listId: string;
  broadcastId: string;
}

const broadcastCancel: ActionDefinition<Input> = {
  key: "broadcast-cancel",
  type: "perform",
  resource: "broadcast",
  title: "Cancel Broadcast",
  description: "Cancel a scheduled broadcast before it sends.",
  idempotent: true,
  params: [accountIdParam, listIdParam, broadcastIdParam],
  output: [{ key: "self_link", type: "string", label: "Broadcast URL" }],

  execute(input, ctx) {
    const { accountId, listId, broadcastId } = input;
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/broadcasts/${
        encodeId(broadcastId)
      }/cancel`,
      { method: "POST" },
    );
  },
};

export default broadcastCancel;
