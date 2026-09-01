import { assertEquals } from "@std/assert";
import calendarEventsApprove from "../../actions/calendar-events-approve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-events-approve: posts calendar_event_id and returns ok", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await calendarEventsApprove.execute({ calendarEventId: "calev-1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/calendars/events/approve");
  assertEquals(JSON.parse(calls[0].body!), { calendar_event_id: "calev-1" });
  assertEquals(out, { ok: true });
});
