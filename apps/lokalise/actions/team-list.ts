import type { ActionDefinition } from "@w6w/types";
import { LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /teams` — every team this token can see, with its plan and quota
 * usage/allocation. `health/quota.ts` reads the same endpoint on its own
 * schedule; this action exposes it directly for a workflow that wants the
 * current numbers rather than just a health verdict.
 */
interface Input {
  limit?: number;
  page?: number;
}

const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List Teams",
  description: "List the teams this token can see, including plan and quota usage.",
  params: paginationParams(100).filter((p) => p.key !== "cursor"),
  output: [
    { key: "items", type: "array", label: "Teams" },
    { key: "totalCount", type: "number", label: "Total teams" },
  ],

  async execute(input, ctx) {
    const { items, totalCount } = await new LokaliseClient(ctx).list("/teams", "teams", {
      query: paginationQuery(input),
    });
    return { items, totalCount };
  },
};

export default teamList;
