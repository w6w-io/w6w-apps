import { assertEquals } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/calendar-delete.ts";

Deno.test("calendar-delete: DELETEs /calendars/<uid>", async () => {
  const { ctx, calls } = mockCalendarCtx([
    { body: { calendars: [{ uid: "abc", calstatus: "deleted" }] } },
  ]);
  const out = await action.execute({ calendarUid: "abc" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/calendars/abc");
  assertEquals(out, { uid: "abc", calstatus: "deleted" });
});
