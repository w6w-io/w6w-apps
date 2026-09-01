import { assertEquals } from "@std/assert";
import calendarEventsAdd from "../../actions/calendar-events-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-events-add: luma platform sends only event_id + submission_mode", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "calev-1", status: "approved" } }]);
  await calendarEventsAdd.execute(
    { platform: "luma", eventId: "evt-1", submissionMode: "auto" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/calendars/events/add");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { platform: "luma", submission_mode: "auto", event_id: "evt-1" });
});

Deno.test("calendar-events-add: external platform sends the external event fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "calev-2", status: "pending" } }]);
  await calendarEventsAdd.execute(
    {
      platform: "external",
      url: "https://example.com/e",
      name: "External Meetup",
      startAt: "2026-10-01T18:00:00.000Z",
      durationInterval: "PT2H",
      timezone: "America/New_York",
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.platform, "external");
  assertEquals(body.url, "https://example.com/e");
  assertEquals(body.name, "External Meetup");
  // No luma-only field leaks into the external body.
  assertEquals("event_id" in body, false);
});
