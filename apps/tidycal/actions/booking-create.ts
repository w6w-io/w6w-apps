import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, TidyCalClient } from "../lib/client.ts";
import { bookingTypeIdParam } from "../lib/params.ts";

/**
 * `POST /api/booking-types/{bookingType}/bookings` — book a slot on someone's
 * calendar.
 *
 * ## One request, two response shapes
 *
 * TidyCal documents this explicitly, and it is the single most likely thing to
 * break a consumer:
 *
 *  - a **single** booking (`starts_at`) answers `{"data": {Booking}}`;
 *  - a **package** booking (the `bookings` array of session start times) answers
 *    `{"data": [{Booking}, …]}`.
 *
 * The body decides which. When `bookings` is present, `starts_at` is ignored
 * outright — so sending both silently books the array and discards the scalar.
 *
 * ## Required fields are about the *booker*, not the time
 *
 * `name`, `email` and `timezone` are the required trio; `starts_at` is not
 * marked required precisely because the `bookings` array can stand in for it.
 * Send one of the two or TidyCal has no time to book.
 *
 * `idempotent: false`. There is no idempotency key. A retry either books a
 * second slot or answers `409 Conflict` because the first attempt took the one
 * it wanted — neither is a safe automatic retry.
 */
interface Input {
  bookingType: number;
  starts_at?: string;
  bookings?: unknown;
  name: string;
  email: string;
  timezone: string;
  booking_questions?: unknown;
}

const bookingCreate: ActionDefinition<Input> = {
  key: "booking-create",
  type: "perform",
  resource: "booking",
  title: "Create booking",
  description: "Book a timeslot on a booking type for a named guest.",
  idempotent: false,
  params: [
    bookingTypeIdParam,
    {
      key: "starts_at",
      label: "Start time (UTC)",
      type: "datetime",
      placeholder: "2026-03-20T10:00:00Z",
      hint: "Required for a single booking, and IGNORED when Session start times is filled in. " +
        "Take a value from List available timeslots.",
    },
    {
      key: "name",
      label: "Guest name",
      type: "string",
      required: true,
      validation: { maxLength: 191 },
    },
    {
      key: "email",
      label: "Guest email",
      type: "string",
      required: true,
      validation: { maxLength: 191 },
    },
    {
      key: "timezone",
      label: "Guest timezone",
      type: "string",
      required: true,
      placeholder: "America/Los_Angeles",
      hint: "IANA timezone name. Required — TidyCal has no default.",
    },
    {
      key: "bookings",
      label: "Session start times (package booking)",
      type: "json",
      hint: 'For a multi-session package: [{"starts_at": "2026-03-20T10:00:00Z"}, …]. When ' +
        "present, Start time is ignored and the response `data` is an ARRAY of bookings " +
        "instead of a single object.",
    },
    {
      key: "booking_questions",
      label: "Answers to booking questions",
      type: "json",
      hint: '[{"booking_type_question_id": 1, "answer": "…"}]. `answer` may be a string, or ' +
        "an array of strings for a checkbox question. TidyCal publishes no endpoint listing a " +
        "booking type's questions, so the IDs come from a previous booking's `questions`.",
    },
  ],
  output: [{
    key: "data",
    type: "object",
    label: "The created booking, or an array of them for a package booking",
  }],

  execute(input, ctx) {
    const bookings = asOptionalJson<unknown[]>(input.bookings, "Session start times");
    const questions = asOptionalJson<unknown[]>(
      input.booking_questions,
      "Answers to booking questions",
    );
    return new TidyCalClient(ctx).json(
      `/booking-types/${encodeId(input.bookingType)}/bookings`,
      {
        method: "POST",
        body: compact({
          // `starts_at` is dropped when `bookings` is present rather than left
          // for the server to ignore: sending a value that is documented to be
          // discarded makes a request log lie about what was booked.
          starts_at: bookings ? undefined : input.starts_at,
          bookings,
          name: input.name,
          email: input.email,
          timezone: input.timezone,
          booking_questions: questions,
        }),
      },
    );
  },
};

export default bookingCreate;
