import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";
import {
  afterParam,
  beforeParam,
  firstParam,
  videoPeriodOptions,
  videoSortOptions,
  videoTypeOptions,
} from "../lib/params.ts";

/**
 * `GET /helix/videos` — Get Videos.
 *
 * Published videos: past-broadcast VODs, highlights and uploads.
 *
 * The reference imposes a structure most callers get wrong twice:
 *
 *  - **`id`, `user_id` and `game_id` are mutually exclusive.** Sending two is
 *    a 400, so this action rejects that combination before spending a request.
 *  - **The filters only apply to the other two.** `language`, `period`, `sort`
 *    and `type` are documented as valid "only if you specify the game_id or
 *    user_id query parameter", and `first` likewise; `after`/`before` are
 *    documented for `user_id` only. Sending them alongside `id` is not a
 *    documented combination, so they are dropped rather than passed through on
 *    a guess.
 *  - **`type` is case-sensitive**: `archive`, `highlight`, `upload`, `all`.
 *
 * A `game_id` query returns at most 500 videos in total, however you page.
 */
interface Input {
  id?: string[] | string;
  userId?: string;
  gameId?: string;
  language?: string;
  period?: string;
  sort?: string;
  type?: string;
  first?: number;
  after?: string;
  before?: string;
}

const getVideos: ActionDefinition<Input> = {
  key: "get-videos",
  type: "search",
  title: "Get Videos",
  description:
    "List published videos by ID, by broadcaster, or by category. Exactly one of those three is " +
    "allowed per request; the language, period, sort and type filters apply only to the " +
    "broadcaster and category forms.",
  resource: "video",
  params: [
    {
      key: "id",
      label: "Video IDs",
      type: "string",
      hint: "One or more video IDs, comma-separated, up to 100. Mutually exclusive with the two " +
        "fields below.",
    },
    {
      key: "userId",
      label: "Broadcaster ID",
      type: "string",
      hint: "All videos owned by this broadcaster. Mutually exclusive with video IDs and " +
        "category ID.",
    },
    {
      key: "gameId",
      label: "Category ID",
      type: "string",
      hint: "Videos showing this category. Returns at most 500 videos in total. Mutually " +
        "exclusive with video IDs and broadcaster ID.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      placeholder: "de",
      hint: "ISO 639-1 code. Only meaningful with a category ID.",
    },
    {
      key: "period",
      label: "Published within",
      type: "select",
      options: videoPeriodOptions,
      hint: "Only meaningful with a broadcaster or category ID.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: videoSortOptions,
      hint: "Only meaningful with a broadcaster or category ID.",
    },
    {
      key: "type",
      label: "Video type",
      type: "select",
      options: videoTypeOptions,
      hint: "Only meaningful with a broadcaster or category ID.",
    },
    firstParam(100, 20),
    afterParam,
    beforeParam,
  ],
  output: [
    { key: "data", type: "array", label: "Videos" },
    { key: "data[].id", type: "string", label: "Video ID" },
    { key: "data[].stream_id", type: "string", label: "Source stream ID (archives only)" },
    { key: "data[].user_id", type: "string", label: "Broadcaster ID" },
    { key: "data[].user_login", type: "string", label: "Broadcaster login" },
    { key: "data[].title", type: "string", label: "Title" },
    { key: "data[].url", type: "string", label: "Video URL" },
    { key: "data[].created_at", type: "string", label: "Created at (RFC3339)" },
    { key: "data[].published_at", type: "string", label: "Published at (RFC3339)" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    const ids = toList(input.id);
    const selectors = [ids ? "id" : "", input.userId ? "userId" : "", input.gameId ? "gameId" : ""]
      .filter(Boolean);
    if (selectors.length === 0) {
      throw new Error("Get Videos needs exactly one of: video IDs, broadcaster ID, category ID");
    }
    if (selectors.length > 1) {
      throw new Error(
        `Get Videos accepts only one of video IDs, broadcaster ID or category ID — got ${
          selectors.join(" and ")
        }. Twitch documents them as mutually exclusive.`,
      );
    }

    // The filters are documented only for the user_id / game_id forms.
    const filtered = Boolean(input.userId || input.gameId);
    ctx.log("info", "twitch: get videos", { by: selectors[0] });
    return await new TwitchClient(ctx).get("/videos", {
      id: ids,
      user_id: input.userId,
      game_id: input.gameId,
      language: filtered ? input.language : undefined,
      period: filtered ? input.period : undefined,
      sort: filtered ? input.sort : undefined,
      type: filtered ? input.type : undefined,
      first: filtered ? input.first : undefined,
      after: input.userId ? input.after : undefined,
      before: input.userId ? input.before : undefined,
    });
  },
};

export default getVideos;
