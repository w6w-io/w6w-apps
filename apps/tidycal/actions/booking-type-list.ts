import type { ActionDefinition } from "@w6w/types";
import { TidyCalClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/**
 * `GET /api/booking-types` — the scheduling pages this account offers.
 *
 * This is the **only** way to get a booking type's numeric id: TidyCal publishes
 * no single-booking-type read. Confirmed live on 2026-08-11 —
 * `/api/booking-types/1` answers `404 {"message":"The route api/booking-types/1
 * could not be found."}`, which is the router's own not-found rather than an
 * authorization failure. Every other action that takes a `bookingType` id
 * therefore starts here.
 *
 * Each entry carries `url` — the public booking page — plus the pricing fields,
 * which is what makes this list the input to a "share my calendar" workflow.
 */
interface Input {
  page?: number;
}

const bookingTypeList: ActionDefinition<Input> = {
  key: "booking-type-list",
  type: "search",
  resource: "booking-type",
  title: "List booking types",
  description: "List the account's booking types. The only endpoint that returns booking type IDs.",
  params: [pageParam],
  output: [{ key: "data", type: "array", label: "Booking types" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json("/booking-types", { query: { page: input.page } });
  },
};

export default bookingTypeList;
