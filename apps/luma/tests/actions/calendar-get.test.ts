import { assertEquals } from "@std/assert";
import calendarGet from "../../actions/calendar-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-get: calls GET /v1/calendars/get with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cal-1", name: "My Calendar" } }]);
  const out = await calendarGet.execute({}, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/calendars/get");
  assertEquals(out.name, "My Calendar");
});
