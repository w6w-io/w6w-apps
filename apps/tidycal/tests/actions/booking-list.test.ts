import { assertEquals, assertRejects } from "@std/assert";
import bookingList from "../../actions/booking-list.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("booking-list: calls GET /api/bookings", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1 }]) }]);
  const out = await bookingList.execute({}, ctx) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/bookings");
  assertEquals(queryOf(calls[0].url), {});
  // Nothing is unwrapped: the envelope reaches the workflow intact.
  assertEquals(out.data.length, 1);
});

/**
 * The filters TidyCal's document declares `"in": "path"`. They are query
 * parameters — the path template `/bookings` has no placeholder to bind them
 * to — and this is the assertion that keeps them there.
 */
Deno.test("booking-list: the mislabelled filters go in the query string, not the path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await bookingList.execute(
    { starts_at: "2026-01-01", ends_at: "2026-02-01", cancelled: true, page: 3 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/bookings");
  assertEquals(queryOf(calls[0].url), {
    starts_at: "2026-01-01",
    ends_at: "2026-02-01",
    cancelled: "true",
    page: "3",
  });
});

/** `include_teams` is what turns "my bookings" into "my bookings plus my teams'". */
Deno.test("booking-list: include_teams is sent only when asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }, { body: envelope([]) }]);
  await bookingList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).include_teams, undefined);

  await bookingList.execute({ include_teams: true }, ctx);
  assertEquals(queryOf(calls[1].url).include_teams, "true");
});

/**
 * `false` survives rather than being dropped. TidyCal documents three distinct
 * states for `cancelled`; collapsing `false` into absence would lose one.
 */
Deno.test("booking-list: cancelled=false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await bookingList.execute({ cancelled: false }, ctx);
  assertEquals(queryOf(calls[0].url).cancelled, "false");
});

Deno.test("booking-list: an error surfaces TidyCal's own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(() => Promise.resolve(bookingList.execute({}, ctx)), Error);
  assertEquals(err.message.includes("401"), true, err.message);
  assertEquals(err.message.includes("Unauthenticated."), true, err.message);
});
