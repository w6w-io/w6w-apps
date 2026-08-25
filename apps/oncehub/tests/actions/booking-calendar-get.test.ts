import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-calendar-get.ts";

Deno.test("booking-calendar-get: GETs /booking-calendars/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "BKC-1" } }]);
  await action.execute({ id: "BKC-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/booking-calendars/BKC-1");
});

Deno.test("booking-calendar-get: surfaces a redacted-mode deletion as a normal 200 body", async () => {
  const { ctx } = mockCtx([
    { body: { id: "BKC-1", object: "booking_calendar", deleted: true } },
  ]);
  const result = await action.execute({ id: "BKC-1" }, ctx) as { deleted?: boolean };
  assertEquals(result.deleted, true);
});
