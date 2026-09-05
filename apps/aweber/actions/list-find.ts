import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists?ws.op=find` — find a list by (partial)
 * name or by its unique list id, without paging through every list on the
 * account first.
 */
interface Input {
  accountId: string;
  name?: string;
  start?: number;
  size?: number;
}

const listFind: ActionDefinition<Input> = {
  key: "list-find",
  type: "search",
  resource: "list",
  title: "Find Lists",
  description: "Find lists on an account by name or unique list id.",
  params: [
    accountIdParam,
    {
      key: "name",
      label: "Name or unique list ID",
      type: "string",
      hint: "Leave empty to match every list on the account.",
    },
    ...paginationParams(),
  ],
  output: [{ key: "entries", type: "array", label: "Matching lists" }],

  execute(input, ctx) {
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists`,
      { "ws.op": "find", name: input.name, ...paginationQuery(input) },
    );
  },
};

export default listFind;
