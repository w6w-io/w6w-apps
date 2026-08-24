import type { ActionDefinition } from "@w6w/types";
import { ServiceM8Client, type ServiceM8Page } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/** `GET /staff.json` — list Staff Members. */
interface Input {
  filter?: string;
  sort?: string;
  cursor?: string;
}

const staffList: ActionDefinition<Input, ServiceM8Page<unknown>> = {
  key: "staff-list",
  type: "search",
  resource: "staff",
  title: "Find Staff",
  description: "List Staff Members, with optional $filter/$sort and cursor pagination.",
  params: listParams(),
  output: listOutput("Staff members"),

  execute(input, ctx) {
    return new ServiceM8Client(ctx).list("/staff.json", {
      query: { "$filter": input.filter, "$sort": input.sort, cursor: input.cursor },
    });
  },
};

export default staffList;
