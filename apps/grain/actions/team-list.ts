import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";

interface Output {
  teams: unknown[];
}

/**
 * `POST /_/public-api/v2/teams` — the workspace's teams (`{ id, name }`
 * each). No params, no pagination documented.
 */
const teamList: ActionDefinition<Record<string, never>, Output> = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List Teams",
  description: "List the workspace's teams.",
  params: [],
  output: [{ key: "teams", type: "array", label: "Teams (id, name)" }],

  async execute(_input, ctx) {
    const result = await new GrainClient(ctx).request<{ teams?: unknown[] }>("/v2/teams", {
      method: "POST",
      body: {},
    });
    return { teams: result?.teams ?? [] };
  },
};

export default teamList;
