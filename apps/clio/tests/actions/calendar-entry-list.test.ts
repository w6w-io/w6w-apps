import { assertEquals } from "@std/assert";
import calendarEntryList from "../../actions/calendar-entry-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("calendar-entry-list: calls GET /calendar_entries.json", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await calendarEntryList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/calendar_entries.json");
});

/**
 * calendar_entries.json has no `order` parameter at all — unlike matters,
 * contacts, tasks, activities, documents and notes. Sending one anyway would
 * risk a 400 for an undocumented parameter.
 */
Deno.test("calendar-entry-list: never sends an order parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await calendarEntryList.execute({}, ctx);
  assertEquals("order" in queryOf(calls[0].url), false);
});

Deno.test("calendar-entry-list: forwards calendar, matter and time-range filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await calendarEntryList.execute(
    { calendarId: 2, matterId: 9, from: "2026-01-01T00:00:00Z", to: "2026-01-31T00:00:00Z" },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.calendar_id, "2");
  assertEquals(q.matter_id, "9");
  assertEquals(q.from, "2026-01-01T00:00:00Z");
  assertEquals(q.to, "2026-01-31T00:00:00Z");
});
