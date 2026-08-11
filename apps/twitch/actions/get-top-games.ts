import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { afterParam, beforeParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/games/top` — Get Top Games.
 *
 * The categories with the most viewers right now, most popular first. No
 * required parameters, no scope, and reachable by either token kind — which
 * also makes it the cheapest smoke test that a connection is wired up.
 *
 * Twitch's own summary line for this endpoint reads "Gets information about all
 * broadcasts on Twitch", which is a documentation slip: the response rows are
 * categories (`id`, `name`, `box_art_url`, `igdb_id`), identical in shape to
 * Get Games.
 */
interface Input {
  first?: number;
  after?: string;
  before?: string;
}

const getTopGames: ActionDefinition<Input> = {
  key: "get-top-games",
  type: "read",
  title: "Get Top Games",
  description:
    "List the Twitch categories with the most viewers right now, most popular first. Needs no " +
    "parameters and no scope.",
  resource: "game",
  params: [firstParam(100, 20), afterParam, beforeParam],
  output: [
    { key: "data", type: "array", label: "Categories, most viewers first" },
    { key: "data[].id", type: "string", label: "Category ID" },
    { key: "data[].name", type: "string", label: "Category name" },
    { key: "data[].box_art_url", type: "string", label: "Box art URL template" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get top games");
    return await new TwitchClient(ctx).get("/games/top", {
      first: input.first,
      after: input.after,
      before: input.before,
    });
  },
};

export default getTopGames;
