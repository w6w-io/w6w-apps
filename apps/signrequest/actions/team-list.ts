import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  limit?: number;
}

/**
 * `GET /teams/` — list the team(s) this API token belongs to. Team creation, settings updates,
 * deletion and member invitation are left to SignRequest's own UI — see `README.md`.
 */
const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List the team(s) this API token belongs to.",
  params: [pageParam, limitParam],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Teams" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/teams/", {
      query: compact({ page: input.page, limit: input.limit }),
    });
  },
};

export default teamList;
