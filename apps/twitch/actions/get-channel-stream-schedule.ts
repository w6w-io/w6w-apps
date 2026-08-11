import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";
import { afterParam, broadcasterIdParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/schedule` — Get Channel Stream Schedule.
 *
 * The broadcaster's published stream schedule: recurring and one-off segments,
 * plus the current vacation window if one is set.
 *
 * Two things the reference is specific about and that differ from every other
 * paged endpoint in this app:
 *
 *  - **`first` maxes at 25, not 100.** A request for 100 is a 400.
 *  - **`data` is an object, not an array.** The segments live at
 *    `data.segments`, alongside `data.broadcaster_id` and `data.vacation`.
 *    Treating `data` as a list — which every sibling endpoint would justify —
 *    yields nothing.
 *
 * `utc_offset` is documented as "Not supported" and is therefore not offered.
 */
interface Input {
  broadcasterId: string;
  id?: string[] | string;
  startTime?: string;
  first?: number;
  after?: string;
}

const getChannelStreamSchedule: ActionDefinition<Input> = {
  key: "get-channel-stream-schedule",
  type: "read",
  title: "Get Channel Stream Schedule",
  description:
    "Read a broadcaster's published stream schedule — upcoming segments, their categories, and " +
    "any vacation window. The segments are at data.segments; data itself is an object, not a list.",
  resource: "schedule",
  params: [
    broadcasterIdParam(),
    {
      key: "id",
      label: "Segment IDs",
      type: "string",
      hint: "One or more scheduled-segment IDs, comma-separated, up to 100. Leave empty for the " +
        "whole schedule.",
    },
    {
      key: "startTime",
      label: "Start from",
      type: "datetime",
      placeholder: "2026-09-01T00:00:00Z",
      hint: "RFC3339 timestamp. Segments starting after this point are returned; defaults to now.",
    },
    firstParam(25, 20),
    afterParam,
  ],
  output: [
    { key: "data", type: "object", label: "Schedule (an object, not a list)" },
    { key: "data.broadcaster_id", type: "string", label: "Broadcaster ID" },
    { key: "data.segments", type: "array", label: "Scheduled segments" },
    { key: "data.vacation", type: "object", label: "Vacation window, or null" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get channel stream schedule");
    return await new TwitchClient(ctx).get("/schedule", {
      broadcaster_id: input.broadcasterId,
      id: toList(input.id),
      start_time: input.startTime,
      first: input.first,
      after: input.after,
    });
  },
};

export default getChannelStreamSchedule;
