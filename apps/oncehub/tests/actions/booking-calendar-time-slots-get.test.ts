import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-calendar-time-slots-get.ts";

Deno.test("booking-calendar-time-slots-get: GETs /booking-calendars/{id}/time-slots with the range", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute(
    { id: "BKC-1", startTime: "2026-08-15T00:00:00.000Z", endTime: "2026-08-20T00:00:00.000Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/booking-calendars/BKC-1/time-slots");
  assertEquals(url.searchParams.get("start_time"), "2026-08-15T00:00:00.000Z");
  assertEquals(url.searchParams.get("end_time"), "2026-08-20T00:00:00.000Z");
});

Deno.test("booking-calendar-time-slots-get: omits the range when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ id: "BKC-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("start_time"), false);
  assertEquals(url.searchParams.has("end_time"), false);
});
