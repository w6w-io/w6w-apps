import type { ActionDefinition } from "@w6w/types";
import { encodeId, TidyCalClient } from "../lib/client.ts";
import { bookingTypeIdParam } from "../lib/params.ts";

/**
 * `GET /api/booking-types/{bookingType}/timeslots` — what is actually bookable.
 *
 * This is the endpoint worth building a workflow around: TidyCal resolves the
 * availability schedule, existing bookings, connected-calendar conflicts,
 * padding and the minimum-notice threshold, and hands back the resulting slots.
 * Nothing in this app reproduces that arithmetic.
 *
 * **Both bounds are required and both are UTC.** They are the only parameters in
 * the whole document declared `"in": "query"`, `required: true` — the window is
 * not optional, and there is no documented maximum span.
 *
 * `available_bookings` on each slot is the remaining seat count, which is
 * meaningful for a group booking type (`max_bookings` above 1) and is 1 for an
 * ordinary one.
 */
interface Input {
  bookingType: number;
  starts_at: string;
  ends_at: string;
}

const timeslotList: ActionDefinition<Input> = {
  key: "timeslot-list",
  type: "search",
  resource: "timeslot",
  title: "List available timeslots",
  description:
    "List bookable timeslots for a booking type within a UTC window, after TidyCal applies " +
    "availability, existing bookings, calendar conflicts and padding.",
  params: [
    bookingTypeIdParam,
    {
      key: "starts_at",
      label: "Window start (UTC)",
      type: "datetime",
      required: true,
      placeholder: "2026-03-20T00:00:00Z",
      hint: "Required. TidyCal interprets this as UTC.",
    },
    {
      key: "ends_at",
      label: "Window end (UTC)",
      type: "datetime",
      required: true,
      placeholder: "2026-03-27T00:00:00Z",
      hint: "Required. TidyCal documents no maximum window length.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Available timeslots" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(
      `/booking-types/${encodeId(input.bookingType)}/timeslots`,
      { query: { starts_at: input.starts_at, ends_at: input.ends_at } },
    );
  },
};

export default timeslotList;
