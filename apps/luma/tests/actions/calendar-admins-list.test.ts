import { assertEquals } from "@std/assert";
import calendarAdminsList from "../../actions/calendar-admins-list.ts";
import { listBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-admins-list: calls GET /v1/calendars/admins/list", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([{ id: "usr-1", name: "Ada" }]) }]);
  const out = await calendarAdminsList.execute({}, ctx) as { entries: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v1/calendars/admins/list");
  assertEquals(out.entries.length, 1);
});
