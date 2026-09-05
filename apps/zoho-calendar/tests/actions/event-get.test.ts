import { assertEquals } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/event-get.ts";

Deno.test("event-get: GETs .../events/<uid> and unwraps the single entry", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [{ uid: "e1", etag: "123" }] } }]);
  const out = await action.execute({ calendarUid: "cal1", eventUid: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/calendars/cal1/events/e1");
  assertEquals(out, { uid: "e1", etag: "123" });
});

Deno.test("event-get: passes recurrenceId through", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [{ uid: "e1" }] } }]);
  await action.execute(
    { calendarUid: "cal1", eventUid: "e1", recurrenceId: "20240115T000000Z" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("recurrenceid"), "20240115T000000Z");
});
