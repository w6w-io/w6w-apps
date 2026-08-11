import type { ActionDefinition } from "@w6w/types";
import { TidyCalClient } from "../lib/client.ts";
import {
  bookingTypeBody,
  type BookingTypeBodyInput,
  bookingTypeBodyParams,
} from "../lib/params.ts";

/**
 * `POST /api/booking-types` — create a personal booking type.
 *
 * Four of the eighteen body fields are required — `title`, `description`,
 * `duration_minutes`, `url_slug` — and `description` being one of them is the
 * surprise: an empty description is a `422`, not a default.
 *
 * `idempotent: false`. TidyCal accepts no idempotency key on any operation, and
 * nothing in the document says `url_slug` is unique, so a retry after a dropped
 * connection may well produce a second booking type rather than converging.
 *
 * The response is `{"data": {BookingType}}` — creates keep the envelope that
 * single reads drop.
 */
type Input = BookingTypeBodyInput;

const bookingTypeCreate: ActionDefinition<Input> = {
  key: "booking-type-create",
  type: "perform",
  resource: "booking-type",
  title: "Create booking type",
  description: "Create a new personal booking type (scheduling page).",
  idempotent: false,
  params: bookingTypeBodyParams(),
  output: [{ key: "data", type: "object", label: "The created booking type" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json("/booking-types", {
      method: "POST",
      body: bookingTypeBody(input),
    });
  },
};

export default bookingTypeCreate;
