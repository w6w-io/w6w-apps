import { assertEquals } from "@std/assert";
import calendarEventsReject from "../../actions/calendar-events-reject.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-events-reject: posts calendar_event_id + optional message", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await calendarEventsReject.execute(
    { calendarEventId: "calev-1", message: "Not a fit for this calendar" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/calendars/events/reject");
  assertEquals(JSON.parse(calls[0].body!), {
    calendar_event_id: "calev-1",
    message: "Not a fit for this calendar",
  });
});

Deno.test("calendar-events-reject: message is omitted, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await calendarEventsReject.execute({ calendarEventId: "calev-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { calendar_event_id: "calev-1" });
});
