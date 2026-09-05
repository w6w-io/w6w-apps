import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage } from "../lib/client.ts";

/** `GET /v2/groups` — all groups in the account. */
type Input = Record<string, never>;

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List all groups in the account.",
  output: [
    { key: "data", type: "array", label: "Groups" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(_input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>("/groups");
  },
};

export default groupList;
