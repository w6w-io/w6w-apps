import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/** `GET /teams` — every team in the organization. */
const action: ActionDefinition = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List teams",
  description: "List every team in the organization.",
  params: [],
  output: [{ key: "teams", type: "array", label: "Teams" }],

  async execute(_input, ctx) {
    const teams = await new OnfleetClient(ctx).request<unknown[]>("/teams");
    return { teams: teams ?? [] };
  },
};

export default action;
