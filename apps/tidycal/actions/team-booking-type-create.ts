import type { ActionDefinition } from "@w6w/types";
import { encodeId, TidyCalClient } from "../lib/client.ts";
import {
  bookingTypeBody,
  type BookingTypeBodyInput,
  bookingTypeBodyParams,
  teamIdParam,
} from "../lib/params.ts";

/**
 * `POST /api/teams/{team}/booking-types` — create a booking type owned by a team.
 *
 * The request body is byte-identical to the personal create's — TidyCal declares
 * the same eighteen fields with the same bounds and the same four required ones
 * — which is why both actions share `bookingTypeBodyParams()` rather than
 * keeping two copies that could drift.
 *
 * `idempotent: false`, for the same reason as the personal create: no
 * idempotency key, and no documented uniqueness on `url_slug`.
 */
type Input = BookingTypeBodyInput & { team: number };

const teamBookingTypeCreate: ActionDefinition<Input> = {
  key: "team-booking-type-create",
  type: "perform",
  resource: "team",
  title: "Create team booking type",
  description: "Create a new booking type owned by a team.",
  idempotent: false,
  params: [teamIdParam, ...bookingTypeBodyParams()],
  output: [{ key: "data", type: "object", label: "The created booking type" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(`/teams/${encodeId(input.team)}/booking-types`, {
      method: "POST",
      body: bookingTypeBody(input),
    });
  },
};

export default teamBookingTypeCreate;
