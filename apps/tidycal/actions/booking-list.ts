import type { ActionDefinition } from "@w6w/types";
import { flag, TidyCalClient } from "../lib/client.ts";
import { bookingWindowParams, pageParam } from "../lib/params.ts";

/**
 * `GET /api/bookings` — the authenticated user's own bookings.
 *
 * Two traps live in this one operation, both documented at length in
 * `lib/params.ts`:
 *
 *  - its filters are declared `"in": "path"` in TidyCal's OpenAPI document and
 *    are in fact query parameters;
 *  - it spells the date window `starts_at`/`ends_at`, where the otherwise
 *    identical team list spells it `start_date`/`end_date`.
 *
 * `include_teams` is what makes this list "own bookings" by default: bookings
 * that belong to a team you are a member of are excluded until you ask for
 * them.
 */
interface Input {
  starts_at?: string;
  ends_at?: string;
  cancelled?: boolean;
  include_teams?: boolean;
  page?: number;
}

const bookingList: ActionDefinition<Input> = {
  key: "booking-list",
  type: "search",
  resource: "booking",
  title: "List bookings",
  description: "List the connected account's bookings, optionally filtered by date window.",
  params: [
    ...bookingWindowParams(),
    {
      key: "cancelled",
      label: "Cancelled only",
      type: "boolean",
      hint: 'TidyCal documents this as "get only cancelled bookings" and says nothing about ' +
        "what `false` does here — only the team booking list documents the three-state " +
        "behaviour. Leave unset for TidyCal's default.",
    },
    {
      key: "include_teams",
      label: "Include team bookings",
      type: "boolean",
      hint: "Off by default, matching the API: bookings owned by a team you belong to are not " +
        "listed until you turn this on.",
    },
    pageParam,
  ],
  output: [{ key: "data", type: "array", label: "Bookings" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json("/bookings", {
      query: {
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        cancelled: flag(input.cancelled),
        include_teams: flag(input.include_teams),
        page: input.page,
      },
    });
  },
};

export default bookingList;
