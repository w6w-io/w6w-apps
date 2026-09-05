import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";
import { envelopeOutput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/** `GET /api/v1/funds.json`. */
const fundList: ActionDefinition<Input> = {
  key: "fund-list",
  type: "read",
  resource: "fund",
  title: "List Funds",
  description: "List funds on the connected LGL account.",
  params: [...paginationParams()],
  output: envelopeOutput,

  async execute(input, ctx) {
    return await new LglClient(ctx).list("/funds", { query: paginationQuery(input) });
  },
};

export default fundList;
