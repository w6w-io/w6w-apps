import { assertEquals } from "@std/assert";
import calendarEventsLookup from "../../actions/calendar-events-lookup.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("calendar-events-lookup: looks up by event_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { event: { id: "calev-1", status: "approved" } } }]);
  await calendarEventsLookup.execute({ eventId: "evt-1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/calendars/events/lookup");
  assertEquals(queryOf(calls[0].url), { event_id: "evt-1" });
});

Deno.test("calendar-events-lookup: looks up by external url and platform", async () => {
  const { ctx, calls } = mockCtx([{ body: { event: null } }]);
  await calendarEventsLookup.execute(
    { platform: "external", url: "https://example.com/e" },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), { platform: "external", url: "https://example.com/e" });
});
