import { assertEquals } from "@std/assert";
import calendarUpdate from "../../actions/calendar-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-update: posts only the fields set, dropping the rest", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cal-1", name: "New Name" } }]);
  await calendarUpdate.execute({ calendarId: "cal-1", name: "New Name" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/calendars/update");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { calendar_id: "cal-1", name: "New Name" });
});
