import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import {
  accountIdParam,
  broadcastStatusOptions,
  listIdParam,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists/{listId}/broadcasts` — a list's broadcast
 * newsletters, one status at a time.
 *
 * `status` is **required** — there is no "all broadcasts" call, only
 * draft-scoped, scheduled-scoped, or sent-scoped reads (each sorted
 * differently: `broadcast_id`, `scheduled_for`, `sent_at` respectively). And
 * `draft` "only returns API created Broadcast drafts" per AWeber's own
 * caveat — a broadcast someone is drafting in the AWeber web UI never shows
 * up here.
 */
interface Input {
  accountId: string;
  listId: string;
  status: string;
  start?: number;
  size?: number;
}

const broadcastList: ActionDefinition<Input> = {
  key: "broadcast-list",
  type: "search",
  resource: "broadcast",
  title: "List Broadcasts",
  description:
    "List a list's broadcasts by status. Draft only returns drafts created through this API.",
  params: [
    accountIdParam,
    listIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: broadcastStatusOptions,
    },
    ...paginationParams(),
  ],
  output: [
    { key: "entries", type: "array", label: "Broadcasts" },
    { key: "total_size", type: "number", label: "Total matching broadcasts" },
  ],

  execute(input, ctx) {
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/broadcasts`,
      { status: input.status, ...paginationQuery(input) },
    );
  },
};

export default broadcastList;
