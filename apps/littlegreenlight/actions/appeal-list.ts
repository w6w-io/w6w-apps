import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";
import { envelopeOutput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/** `GET /api/v1/appeals.json`. */
const appealList: ActionDefinition<Input> = {
  key: "appeal-list",
  type: "read",
  resource: "appeal",
  title: "List Appeals",
  description: "List appeals on the connected LGL account.",
  params: [...paginationParams()],
  output: envelopeOutput,

  async execute(input, ctx) {
    return await new LglClient(ctx).list("/appeals", { query: paginationQuery(input) });
  },
};

export default appealList;
