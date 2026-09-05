import { assertEquals } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/event-group-attendees-get.ts";

Deno.test("event-group-attendees-get: GETs .../groupattendeestatus?groupId=", async () => {
  const { ctx, calls } = mockCalendarCtx([
    { body: { GRP_MEM_OBJ: { "53703592": { eid: "user@zohocorp.com", rsvp: "yes" } } } },
  ]);
  const out = await action.execute(
    { calendarUid: "cal1", eventUid: "e1", groupId: "61234527" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars/cal1/events/e1/groupattendeestatus");
  assertEquals(url.searchParams.get("groupId"), "61234527");
  assertEquals(out, { GRP_MEM_OBJ: { "53703592": { eid: "user@zohocorp.com", rsvp: "yes" } } });
});
