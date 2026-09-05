import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, listIdParam } from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists/{listId}` — one list's profile and
 * subscriber counts (`total_subscribers`, `total_unconfirmed_subscribers`,
 * `total_unsubscribed_subscribers`, plus today/yesterday deltas), and the
 * collection links every other list-scoped action is built from
 * (`subscribers_collection_link`, `segments_collection_link`, …).
 */
interface Input {
  accountId: string;
  listId: string;
}

const listGet: ActionDefinition<Input> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Get one list's profile and subscriber counts.",
  params: [accountIdParam, listIdParam],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "total_subscribers", type: "number", label: "Total subscribers" },
  ],

  execute(input, ctx) {
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}`,
    );
  },
};

export default listGet;
