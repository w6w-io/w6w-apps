import type { ActionDefinition } from "@w6w/types";
import { flag, toList, TwitchClient } from "../lib/client.ts";
import { afterParam, beforeParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/clips` — Get Clips.
 *
 * Like Get Videos, the three selectors — `broadcaster_id`, `game_id` and `id` —
 * are documented as mutually exclusive, and this action refuses the combination
 * rather than spending a request on a 400.
 *
 * The date window is the part that surprises people: **if `started_at` is set
 * and `ended_at` is not, Twitch uses "the start date plus one week"**, not "up
 * to now". A workflow polling for clips from a month-old stream with only a
 * start date silently sees nothing.
 *
 * Twitch also caps cumulative paging at roughly 1,000 clips per query however
 * many pages are walked; the documented workaround is to slice the query into
 * narrower `started_at`/`ended_at` windows.
 */
interface Input {
  broadcasterId?: string;
  gameId?: string;
  id?: string[] | string;
  startedAt?: string;
  endedAt?: string;
  isFeatured?: boolean;
  first?: number;
  after?: string;
  before?: string;
}

const getClips: ActionDefinition<Input> = {
  key: "get-clips",
  type: "search",
  title: "Get Clips",
  description:
    "List clips by broadcaster, by category, or by clip ID — exactly one of the three per " +
    "request. Setting a start date without an end date gives a one-week window, not everything " +
    "since; paging is capped at roughly 1,000 clips per query.",
  resource: "clip",
  params: [
    {
      key: "broadcasterId",
      label: "Broadcaster ID",
      type: "string",
      hint: "Clips captured from this broadcaster's streams, most viewed first. Mutually " +
        "exclusive with the two fields below.",
    },
    {
      key: "gameId",
      label: "Category ID",
      type: "string",
      hint: "Clips captured from streams playing this category. Mutually exclusive with " +
        "broadcaster ID and clip IDs.",
    },
    {
      key: "id",
      label: "Clip IDs",
      type: "string",
      hint: "One or more clip IDs, comma-separated, up to 100. Results come back in the order " +
        "given. Mutually exclusive with the two fields above.",
    },
    {
      key: "startedAt",
      label: "From",
      type: "datetime",
      hint: "RFC3339. If you set this and leave the end date empty, Twitch returns a ONE-WEEK " +
        "window starting here — not everything since.",
    },
    {
      key: "endedAt",
      label: "To",
      type: "datetime",
      hint: "RFC3339. Set it whenever you set a start date.",
    },
    {
      key: "isFeatured",
      label: "Featured only",
      type: "boolean",
      hint: "On returns only featured clips, off returns only unfeatured ones. Leave unset for " +
        "both.",
    },
    firstParam(100, 20),
    afterParam,
    beforeParam,
  ],
  output: [
    { key: "data", type: "array", label: "Clips" },
    { key: "data[].id", type: "string", label: "Clip ID" },
    { key: "data[].url", type: "string", label: "Clip URL" },
    { key: "data[].embed_url", type: "string", label: "Embed URL" },
    { key: "data[].broadcaster_id", type: "string", label: "Broadcaster ID" },
    { key: "data[].broadcaster_name", type: "string", label: "Broadcaster display name" },
    { key: "data[].creator_name", type: "string", label: "Clip creator display name" },
    { key: "data[].video_id", type: "string", label: "Source video ID" },
    { key: "data[].game_id", type: "string", label: "Category ID" },
    { key: "data[].title", type: "string", label: "Title" },
    { key: "data[].view_count", type: "number", label: "Views" },
    { key: "data[].created_at", type: "string", label: "Created at (RFC3339)" },
    { key: "data[].duration", type: "number", label: "Duration (seconds)" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    const ids = toList(input.id);
    const selectors = [
      input.broadcasterId ? "broadcasterId" : "",
      input.gameId ? "gameId" : "",
      ids ? "id" : "",
    ].filter(Boolean);
    if (selectors.length === 0) {
      throw new Error("Get Clips needs exactly one of: broadcaster ID, category ID, clip IDs");
    }
    if (selectors.length > 1) {
      throw new Error(
        `Get Clips accepts only one of broadcaster ID, category ID or clip IDs — got ${
          selectors.join(" and ")
        }. Twitch documents them as mutually exclusive.`,
      );
    }

    ctx.log("info", "twitch: get clips", { by: selectors[0] });
    return await new TwitchClient(ctx).get("/clips", {
      broadcaster_id: input.broadcasterId,
      game_id: input.gameId,
      id: ids,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      is_featured: flag(input.isFeatured),
      first: input.first,
      after: input.after,
      before: input.before,
    });
  },
};

export default getClips;
