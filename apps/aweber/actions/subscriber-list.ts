import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import {
  accountIdParam,
  listIdParam,
  paginationParams,
  paginationQuery,
  sortOrderOptions,
} from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists/{listId}/subscribers` — every subscriber
 * on a list, oldest-added first by default.
 */
interface Input {
  accountId: string;
  listId: string;
  sortOrder?: string;
  start?: number;
  size?: number;
}

const subscriberList: ActionDefinition<Input> = {
  key: "subscriber-list",
  type: "search",
  resource: "subscriber",
  title: "List Subscribers",
  description: "List the subscribers on a list, oldest-added first by default.",
  params: [
    accountIdParam,
    listIdParam,
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: sortOrderOptions,
      hint:
        "By the order subscribers were added to the list. Defaults to ascending (oldest first).",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "entries", type: "array", label: "Subscribers" },
    { key: "total_size", type: "number", label: "Total subscribers on the list" },
  ],

  execute(input, ctx) {
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/subscribers`,
      { sort_order: input.sortOrder, ...paginationQuery(input) },
    );
  },
};

export default subscriberList;
