import type { ActionDefinition } from "@w6w/types";
import { flag, TwitchClient } from "../lib/client.ts";
import { afterParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/search/channels` — Search Channels.
 *
 * Channels that have streamed in the past six months and whose name starts with
 * the query. Two documented behaviours worth knowing before relying on it:
 *
 *  - **`live_only` changes what is matched, not just what is filtered.** With
 *    `live_only=false` Twitch compares against the broadcaster's *login name*;
 *    with `live_only=true` it compares against the broadcaster's *name and the
 *    category name*. Flipping the flag can therefore change which channels
 *    match, not merely how many.
 *  - **It is a prefix match, not a substring one.** The reference: "the
 *    beginning of the broadcaster's name or category must match the query
 *    string". A phrase query like `angel of death` matches names beginning
 *    `angelofdeath` or `angel_of_death`.
 *
 * Channels with no broadcast in the last six months are absent regardless of
 * how exactly the name matches.
 */
interface Input {
  query: string;
  liveOnly?: boolean;
  first?: number;
  after?: string;
}

const searchChannels: ActionDefinition<Input> = {
  key: "search-channels",
  type: "search",
  title: "Search Channels",
  description:
    "Find channels whose name starts with the query and that have streamed within the past six " +
    'months. Turning on "Live only" changes the matching as well as the filtering: Twitch then ' +
    "matches the broadcaster's display name and category rather than the login name.",
  resource: "channel",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "twitchdev",
      hint: "Plain text — do not URL-encode it yourself. Matched as a prefix, case-insensitively.",
    },
    {
      key: "liveOnly",
      label: "Live only",
      type: "boolean",
      hint: "Off (Twitch's default) returns live and offline channels, matched on login name. On " +
        "returns only live channels, matched on display name and category name.",
    },
    firstParam(100, 20),
    afterParam,
  ],
  output: [
    { key: "data", type: "array", label: "Matching channels" },
    { key: "data[].id", type: "string", label: "Broadcaster ID" },
    { key: "data[].broadcaster_login", type: "string", label: "Broadcaster login" },
    { key: "data[].display_name", type: "string", label: "Display name" },
    { key: "data[].is_live", type: "boolean", label: "Live now" },
    { key: "data[].game_id", type: "string", label: "Category ID" },
    { key: "data[].game_name", type: "string", label: "Category name" },
    { key: "data[].title", type: "string", label: "Stream title" },
    { key: "data[].started_at", type: "string", label: "Started at, or empty if offline" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: search channels");
    return await new TwitchClient(ctx).get("/search/channels", {
      query: input.query,
      live_only: flag(input.liveOnly),
      first: input.first,
      after: input.after,
    });
  },
};

export default searchChannels;
