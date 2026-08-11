import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";
import { afterParam, beforeParam, firstParam, streamTypeOptions } from "../lib/params.ts";

/**
 * `GET /helix/streams` — Get Streams.
 *
 * **This endpoint only ever returns live streams.** An offline broadcaster is
 * simply absent from the response — there is no `type: "offline"` row and no
 * error. That is how it is used as a liveness check ("is X streaming right
 * now?"), and also the single most common way it is misread: an empty `data`
 * for a valid `user_login` means *offline*, not *unknown user*. Use Get Channel
 * Information when you need a channel's details regardless of live state.
 *
 * All four filters (`user_id`, `user_login`, `game_id`, `language`) are
 * repeated keys, up to 100 values each, and combine as an AND across kinds.
 *
 * The `tag_ids` and `is_mature` response fields are deprecated: the reference
 * marks `tag_ids` as returning only an empty array since 2023-02-28, and
 * `is_mature` as returning only `false`. Read `tags` and
 * `content_classification_labels` (from Get Channel Information) instead.
 */
interface Input {
  userId?: string[] | string;
  userLogin?: string[] | string;
  gameId?: string[] | string;
  language?: string[] | string;
  type?: string;
  first?: number;
  after?: string;
  before?: string;
}

const getStreams: ActionDefinition<Input> = {
  key: "get-streams",
  type: "search",
  title: "Get Streams",
  description:
    "List live streams, most viewers first, optionally filtered by broadcaster, category or " +
    "language. Only live streams are ever returned — an offline broadcaster is absent from the " +
    "results rather than reported as offline.",
  resource: "stream",
  params: [
    {
      key: "userLogin",
      label: "Broadcaster logins",
      type: "string",
      placeholder: "twitchdev",
      hint: "One or more login names, comma-separated, up to 100. Only those currently live " +
        "appear in the results.",
    },
    {
      key: "userId",
      label: "Broadcaster IDs",
      type: "string",
      hint: "One or more numeric user IDs, comma-separated, up to 100.",
    },
    {
      key: "gameId",
      label: "Category IDs",
      type: "string",
      hint: "One or more category (game) IDs, comma-separated, up to 100. Get them from Search " +
        "Categories.",
    },
    {
      key: "language",
      label: "Languages",
      type: "string",
      placeholder: "en",
      hint: 'One or more ISO 639-1 two-letter codes, comma-separated, up to 100. Use "other" for ' +
        "languages Twitch does not list.",
    },
    {
      key: "type",
      label: "Stream type",
      type: "select",
      options: streamTypeOptions,
      hint: 'Twitch\'s default is "all", which in practice returns the same set as "live".',
    },
    firstParam(100, 20),
    afterParam,
    beforeParam,
  ],
  output: [
    { key: "data", type: "array", label: "Live streams" },
    { key: "data[].id", type: "string", label: "Stream ID" },
    { key: "data[].user_id", type: "string", label: "Broadcaster ID" },
    { key: "data[].user_login", type: "string", label: "Broadcaster login" },
    { key: "data[].user_name", type: "string", label: "Broadcaster display name" },
    { key: "data[].game_id", type: "string", label: "Category ID" },
    { key: "data[].game_name", type: "string", label: "Category name" },
    { key: "data[].title", type: "string", label: "Stream title" },
    { key: "data[].viewer_count", type: "number", label: "Current viewers" },
    { key: "data[].started_at", type: "string", label: "Started at (RFC3339)" },
    { key: "data[].language", type: "string", label: "Language" },
    { key: "data[].thumbnail_url", type: "string", label: "Thumbnail URL template" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get streams");
    return await new TwitchClient(ctx).get("/streams", {
      user_id: toList(input.userId),
      user_login: toList(input.userLogin),
      game_id: toList(input.gameId),
      language: toList(input.language),
      type: input.type,
      first: input.first,
      after: input.after,
      before: input.before,
    });
  },
};

export default getStreams;
