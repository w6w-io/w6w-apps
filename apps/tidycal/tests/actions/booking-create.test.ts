import { assertEquals, assertRejects } from "@std/assert";
import bookingCreate from "../../actions/booking-create.ts";
import { bodyOf, envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const GUEST = { name: "John Doe", email: "john@example.com", timezone: "America/Los_Angeles" };

Deno.test("booking-create: POSTs a single booking to /api/booking-types/{id}/bookings", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 42 }) }]);
  const out = await bookingCreate.execute(
    { bookingType: 3, starts_at: "2026-03-20T10:00:00Z", ...GUEST },
    ctx,
  ) as { data: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/booking-types/3/bookings");
  assertEquals(bodyOf(calls[0]), { starts_at: "2026-03-20T10:00:00Z", ...GUEST });
  assertEquals(out.data.id, 42);
});

/**
 * The documented rule: when `bookings` is present, `starts_at` is ignored. It is
 * dropped here rather than sent-and-ignored, so a request log cannot claim a
 * time that was never booked.
 */
Deno.test("booking-create: a package booking drops the ignored starts_at", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope([{ id: 1 }, { id: 2 }]) }]);
  const out = await bookingCreate.execute(
    {
      bookingType: 3,
      starts_at: "2026-03-20T10:00:00Z",
      bookings: [{ starts_at: "2026-03-20T10:00:00Z" }, { starts_at: "2026-03-27T10:00:00Z" }],
      ...GUEST,
    },
    ctx,
  ) as { data: unknown[] };

  const sent = bodyOf(calls[0]);
  assertEquals(sent.starts_at, undefined, "starts_at was sent alongside a bookings array");
  assertEquals((sent.bookings as unknown[]).length, 2);
  // …and the response for a package booking is an ARRAY in `data`.
  assertEquals(Array.isArray(out.data), true);
  assertEquals(out.data.length, 2);
});

/** A `json` param arrives as either a parsed value or the string a user typed. */
Deno.test("booking-create: json params are accepted as strings too", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await bookingCreate.execute(
    {
      bookingType: 3,
      starts_at: "2026-03-20T10:00:00Z",
      ...GUEST,
      booking_questions: '[{"booking_type_question_id":1,"answer":"Blue"}]',
    },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).booking_questions, [{
    booking_type_question_id: 1,
    answer: "Blue",
  }]);
});

Deno.test("booking-create: unparseable json is rejected before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  // An async wrapper so the assertion holds whether `execute` throws
  // synchronously (it does today — the JSON is parsed before any request is
  // built) or is later made to reject.
  await assertRejects(
    async () =>
      await bookingCreate.execute(
        { bookingType: 3, starts_at: "2026-03-20T10:00:00Z", ...GUEST, bookings: "{oops" },
        ctx,
      ),
    Error,
    "Session start times is not valid JSON",
  );
  assertEquals(calls.length, 0, "a malformed input still reached the network");
});

/** The documented failure for a slot someone else took first. */
Deno.test("booking-create: a 409 surfaces as the conflict it is", async () => {
  const { ctx } = mockCtx([{ status: 409, body: errorBody("The timeslot is not available") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        bookingCreate.execute(
          { bookingType: 3, starts_at: "2026-03-20T10:00:00Z", ...GUEST },
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("409"), true, err.message);
  assertEquals(err.message.includes("not available"), true, err.message);
});
