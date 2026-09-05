import { assertEquals, assertRejects } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/calendar-update.ts";

Deno.test("calendar-update: PUTs /calendars/<uid> with only the changed field", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [{ uid: "abc" }] } }]);
  await action.execute({ calendarUid: "abc", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars/abc");
  assertEquals(JSON.parse(url.searchParams.get("calendarData")!), { name: "Renamed" });
});

Deno.test("calendar-update: rejects with no fields to update, without a request", async () => {
  const { ctx, calls } = mockCalendarCtx([]);
  await assertRejects(() => Promise.resolve(action.execute({ calendarUid: "abc" }, ctx)));
  assertEquals(calls.length, 0);
});
