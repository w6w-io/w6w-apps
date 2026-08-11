import type { ActionDefinition } from "@w6w/types";
import { encodeId, TidyCalClient } from "../lib/client.ts";
import { pageParam, teamIdParam } from "../lib/params.ts";

/**
 * `GET /api/teams/{team}/booking-types` — a team's scheduling pages.
 *
 * Same `BookingType` entity as the personal list, under a different owner. Note
 * that the personal `GET /api/booking-types` does **not** include team booking
 * types — there is no `include_teams` flag on it, unlike the booking list — so
 * this is the only way to see them.
 */
interface Input {
  team: number;
  page?: number;
}

const teamBookingTypeList: ActionDefinition<Input> = {
  key: "team-booking-type-list",
  type: "search",
  resource: "team",
  title: "List team booking types",
  description: "List a team's booking types. The personal booking-type list never includes these.",
  params: [teamIdParam, pageParam],
  output: [{ key: "data", type: "array", label: "Booking types" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(`/teams/${encodeId(input.team)}/booking-types`, {
      query: { page: input.page },
    });
  },
};

export default teamBookingTypeList;
