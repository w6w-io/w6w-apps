import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, broadcastIdParam, listIdParam } from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists/{listId}/broadcasts/{broadcastId}`.
 *
 * `stats` (opens, clicks, complaints, delivered/undelivered counts) is only
 * populated once the broadcast has actually sent — a scheduled or draft
 * broadcast carries no meaningful stats yet.
 */
interface Input {
  accountId: string;
  listId: string;
  broadcastId: string;
}

const broadcastGet: ActionDefinition<Input> = {
  key: "broadcast-get",
  type: "read",
  resource: "broadcast",
  title: "Get Broadcast",
  description: "Get one broadcast by id, including its send stats if it has sent.",
  params: [accountIdParam, listIdParam, broadcastIdParam],
  output: [
    { key: "broadcast_id", type: "string", label: "Broadcast ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "stats", type: "object", label: "Send stats (sent broadcasts only)" },
  ],

  execute(input, ctx) {
    const { accountId, listId, broadcastId } = input;
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/broadcasts/${
        encodeId(broadcastId)
      }`,
    );
  },
};

export default broadcastGet;
