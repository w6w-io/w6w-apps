import type { ActionDefinition } from "@w6w/types";
import { encodeId, flag, TidyCalClient } from "../lib/client.ts";
import { pageParam, teamBookingWindowParams, teamIdParam } from "../lib/params.ts";

/**
 * `GET /api/teams/{team}/bookings` — a team's bookings.
 *
 * The richest filter set in the API, and the one that shows how far it drifts
 * from its personal counterpart. Against `GET /api/bookings` it:
 *
 *  - renames the date window to `start_date` / `end_date`;
 *  - adds `email` and `host_id` filters that have no personal equivalent;
 *  - documents `cancelled` as genuinely three-state — "true for cancelled
 *    bookings, false for non-cancelled bookings, or omit for all bookings" —
 *    which is why `flag()` sends `false` rather than dropping it;
 *  - and declares all of them `"in": "query"`, where the personal endpoint
 *    declares its filters `"in": "path"`. Same document, same release.
 */
interface Input {
  team: number;
  start_date?: string;
  end_date?: string;
  email?: string;
  host_id?: number;
  cancelled?: boolean;
  page?: number;
}

const teamBookingList: ActionDefinition<Input> = {
  key: "team-booking-list",
  type: "search",
  resource: "team",
  title: "List team bookings",
  description: "List a team's bookings, filtered by date window, booker email, host or status.",
  params: [
    teamIdParam,
    ...teamBookingWindowParams(),
    {
      key: "email",
      label: "Booker email",
      type: "string",
      hint: "Only bookings made by this email address.",
    },
    {
      key: "host_id",
      label: "Host user ID",
      type: "number",
      validation: { integer: true },
      hint: "Only bookings hosted by this user. IDs come from List team users.",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      type: "boolean",
      hint: "Three-state, and TidyCal documents all three: on returns only cancelled bookings, " +
        "off returns only live ones, and leaving it unset returns both.",
    },
    pageParam,
  ],
  output: [{ key: "data", type: "array", label: "Bookings" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(`/teams/${encodeId(input.team)}/bookings`, {
      query: {
        start_date: input.start_date,
        end_date: input.end_date,
        email: input.email,
        host_id: input.host_id,
        cancelled: flag(input.cancelled),
        page: input.page,
      },
    });
  },
};

export default teamBookingList;
