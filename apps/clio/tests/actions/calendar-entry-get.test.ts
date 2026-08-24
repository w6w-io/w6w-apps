import { assertEquals } from "@std/assert";
import calendarEntryGet from "../../actions/calendar-entry-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-entry-get: calls GET /calendar_entries/{id}.json and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 6, summary: "Deposition" }) }]);
  const out = await calendarEntryGet.execute({ id: 6 }, ctx) as { summary: string };
  assertEquals(pathOf(calls[0].url), "/api/v4/calendar_entries/6.json");
  assertEquals(out.summary, "Deposition");
});
