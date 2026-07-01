import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-event.ts";

Deno.test("update-event: PATCHes /calendars/{id}/events/{eventId}", async () => {
  const updated = { id: "evt-1", summary: "Renamed" };
  const { ctx, calls } = mockCtx([{ body: updated }]);
  const result = await action.execute!({
    calendarId: "primary",
    eventId: "evt-1",
    summary: "Renamed",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/calendar/v3/calendars/primary/events/evt-1");
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body, { summary: "Renamed" });
  assertEquals(result, updated);
});

Deno.test("update-event: sends only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    calendarId: "primary",
    eventId: "evt-1",
    location: "HQ",
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body, { location: "HQ" });
});

Deno.test("update-event: wraps start/end with timeZone when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    calendarId: "primary",
    eventId: "evt-1",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    timeZone: "UTC",
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.start, { dateTime: "2026-07-01T09:00:00Z", timeZone: "UTC" });
  assertEquals(body.end, { dateTime: "2026-07-01T10:00:00Z", timeZone: "UTC" });
});

Deno.test("update-event: allDay switches start/end to date-only", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    calendarId: "primary",
    eventId: "evt-1",
    allDay: true,
    start: "2026-07-01",
    end: "2026-07-02",
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.start, { date: "2026-07-01" });
  assertEquals(body.end, { date: "2026-07-02" });
});

Deno.test("update-event: forwards sendUpdates as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    calendarId: "primary",
    eventId: "evt-1",
    summary: "x",
    sendUpdates: "all",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("sendUpdates"), "all");
});

Deno.test("update-event: useDefaultReminders=false sends the overrides", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    calendarId: "primary",
    eventId: "evt-1",
    useDefaultReminders: false,
    reminders: [{ method: "popup", minutes: 10 }],
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.reminders, {
    useDefault: false,
    overrides: [{ method: "popup", minutes: 10 }],
  });
});

Deno.test("update-event: encodes email calendar IDs", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    calendarId: "team@example.com",
    eventId: "evt-1",
    summary: "x",
  }, ctx);
  assert(new URL(calls[0].url).pathname.includes("team%40example.com/events/evt-1"));
});
