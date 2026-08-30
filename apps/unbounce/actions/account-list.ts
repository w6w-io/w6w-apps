import type { ActionDefinition, Param } from "@w6w/types";
import { UnbounceClient } from "../lib/client.ts";

/**
 * `GET /accounts` — the entry point to the rest of the API. The reference
 * documents exactly one query parameter here (`sort_order`) — unlike every
 * other collection endpoint in this app, there is no `count` / `from` / `to`
 * / `offset` / `limit`, because a key almost always owns exactly one account.
 */
interface Input {
  sortOrder?: string;
}

const sortOrderParam: Param = {
  key: "sortOrder",
  label: "Sort order",
  type: "select",
  default: "asc",
  options: [
    { value: "asc", label: "Ascending (default)" },
    { value: "desc", label: "Descending" },
  ],
  hint: "Sort by creation date.",
};

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description: "Retrieve the accounts this connection owns.",
  params: [sortOrderParam],
  output: [
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get("/accounts", { sort_order: input.sortOrder });
  },
};

export default accountList;
