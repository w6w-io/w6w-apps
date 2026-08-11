import { assertEquals, assertRejects } from "@std/assert";
import bookingCancel from "../../actions/booking-cancel.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

/** PATCH, not POST or DELETE: any other verb answers 405 with `Allow: PATCH`. */
Deno.test("booking-cancel: PATCHes /api/bookings/{id}/cancel", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, cancelled_at: "2026-03-19T09:00:00Z" } }]);
  const out = await bookingCancel.execute({ booking: 7, reason: "Client rescheduled" }, ctx) as {
    cancelled_at: string;
  };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/bookings/7/cancel");
  assertEquals(bodyOf(calls[0]), { reason: "Client rescheduled" });
  assertEquals(out.cancelled_at, "2026-03-19T09:00:00Z");
});

/** The body is documented `required` while every field in it is optional. */
Deno.test("booking-cancel: sends an empty object when no reason is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7 } }]);
  await bookingCancel.execute({ booking: 7 }, ctx);
  assertEquals(bodyOf(calls[0]), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
});

/**
 * A retry finds the booking already cancelled and is refused rather than
 * cancelling twice — which is what makes `idempotent: true` safe here.
 */
Deno.test("booking-cancel: a second cancel surfaces TidyCal's 400", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Booking is already cancelled") }]);
  const err = await assertRejects(
    () => Promise.resolve(bookingCancel.execute({ booking: 7 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("already cancelled"), true, err.message);
});
