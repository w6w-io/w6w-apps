import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";
import { envelopeOutput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/** `GET /api/v1/groups.json`. */
const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List Groups",
  description: "List constituent groups on the connected LGL account.",
  params: [...paginationParams()],
  output: envelopeOutput,

  async execute(input, ctx) {
    return await new LglClient(ctx).list("/groups", { query: paginationQuery(input) });
  },
};

export default groupList;
