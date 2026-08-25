import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { teamKeyParam } from "../lib/params.ts";

/** `GET /teams/{teamKey}` — one team's members and settings. */
interface Input {
  teamKey: string;
}

const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Fetch one team's members and settings.",
  params: [teamKeyParam],
  output: [{ key: "data", type: "object", label: "The team" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(`/teams/${encodeId(input.teamKey)}`);
  },
};

export default teamGet;
