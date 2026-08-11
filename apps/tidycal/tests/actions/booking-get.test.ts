import { assertEquals, assertRejects } from "@std/assert";
import bookingGet from "../../actions/booking-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The single-resource reads answer the BARE entity. A client that unwrapped
 * `data` would return `undefined` here, which is the whole reason this app
 * unwraps nothing.
 */
Deno.test("booking-get: calls GET /api/bookings/{id} and returns the bare entity", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, starts_at: "2026-03-20T10:00:00Z" } }]);
  const out = await bookingGet.execute({ booking: 7 }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/bookings/7");
  assertEquals(out.id, 7);
});

Deno.test("booking-get: a slash pasted into the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await bookingGet.execute({ booking: "7/../../me" as unknown as number }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/bookings/7%2F..%2F..%2Fme");
});

Deno.test("booking-get: a 403 is reported distinctly from a 404", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("This action is unauthorized.") }]);
  const err = await assertRejects(
    () => Promise.resolve(bookingGet.execute({ booking: 7 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("This action is unauthorized."), true, err.message);
});
