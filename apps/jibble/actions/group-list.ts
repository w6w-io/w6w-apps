import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/** `GET /v1/Groups` — the organization's teams/departments. */
interface Input {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List the organization's groups (teams/departments).",
  params: odataListParams(25),
  output: [
    { key: "items", type: "array", label: "Groups" },
    { key: "count", type: "number", label: "Total matching groups (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(WORKSPACE_HOST, "/v1/Groups", {
      filter: input.filter,
      select: input.select,
      expand: input.expand,
      orderBy: input.orderBy,
      top: input.top,
      skip: input.skip,
      count: input.count,
    });
  },
};

export default groupList;
