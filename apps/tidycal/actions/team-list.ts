import type { ActionDefinition } from "@w6w/types";
import { TidyCalClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/**
 * `GET /api/teams` — the teams this account owns or belongs to.
 *
 * The only source of team IDs, and therefore the entry point to the seven
 * team-scoped operations. The `Team` entity itself is thin — `id`, `name`,
 * `created_at`, `updated_at` — with membership and booking types behind their
 * own endpoints.
 */
interface Input {
  page?: number;
}

const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List teams",
  description: "List the teams the connected account owns or belongs to.",
  params: [pageParam],
  output: [{ key: "data", type: "array", label: "Teams" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json("/teams", { query: { page: input.page } });
  },
};

export default teamList;
