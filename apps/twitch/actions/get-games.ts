import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/games` — Get Games.
 *
 * Look up categories by Twitch ID, by exact name, or by IGDB ID.
 *
 * The reference marks all three parameters "Required?: Yes", which is its way
 * of saying **at least one of the three**, not all three — the 400 row spells
 * it out: "The request must specify the id or name or igdb_id query parameter."
 * All three may be combined, and their total may not exceed 100.
 *
 * `name` must match the category title **exactly**; there is no fuzzy matching
 * here at all. Search Categories is the endpoint that does partial matching,
 * and is almost always the one you actually want when starting from a
 * human-typed string.
 *
 * `box_art_url` comes back with a literal `{width}x{height}` placeholder that
 * the caller substitutes; it is not a usable URL as returned.
 */
interface Input {
  id?: string[] | string;
  name?: string[] | string;
  igdbId?: string[] | string;
}

const getGames: ActionDefinition<Input> = {
  key: "get-games",
  type: "read",
  title: "Get Games",
  description:
    "Look up Twitch categories by ID, exact name, or IGDB ID — at least one of the three, at " +
    "most 100 values in total. Names must match exactly; use Search Categories for partial " +
    "matches.",
  resource: "game",
  params: [
    {
      key: "id",
      label: "Category IDs",
      type: "string",
      placeholder: "33214",
      hint: "One or more Twitch category IDs, comma-separated.",
    },
    {
      key: "name",
      label: "Category names",
      type: "string",
      placeholder: "Fortnite",
      hint: "One or more names, comma-separated. Each must match the category title exactly, " +
        "including capitalisation.",
    },
    {
      key: "igdbId",
      label: "IGDB IDs",
      type: "string",
      hint: "One or more IGDB game IDs, comma-separated.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Categories" },
    { key: "data[].id", type: "string", label: "Category ID" },
    { key: "data[].name", type: "string", label: "Category name" },
    { key: "data[].box_art_url", type: "string", label: "Box art URL template" },
    { key: "data[].igdb_id", type: "string", label: "IGDB ID (empty if unknown)" },
  ],

  async execute(input, ctx) {
    const id = toList(input.id);
    const name = toList(input.name);
    const igdbId = toList(input.igdbId);
    if (!id && !name && !igdbId) {
      throw new Error("Get Games needs at least one of: category IDs, category names, IGDB IDs");
    }
    ctx.log("info", "twitch: get games");
    return await new TwitchClient(ctx).get("/games", { id, name, igdb_id: igdbId });
  },
};

export default getGames;
