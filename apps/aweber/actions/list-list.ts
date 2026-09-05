import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/** `GET /accounts/{accountId}/lists` — every list under this account. */
interface Input {
  accountId: string;
  start?: number;
  size?: number;
}

const listList: ActionDefinition<Input> = {
  key: "list-list",
  type: "search",
  resource: "list",
  title: "List Lists",
  description: "List the lists under an AWeber account.",
  params: [accountIdParam, ...paginationParams()],
  output: [
    { key: "entries", type: "array", label: "Lists" },
    { key: "total_size", type: "number", label: "Total lists" },
  ],

  execute(input, ctx) {
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists`,
      paginationQuery(input),
    );
  },
};

export default listList;
