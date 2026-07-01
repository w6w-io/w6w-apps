import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-event.ts";

Deno.test("create-event: POSTs to /calendars/{id}/events with start/end", async () => {
  const created = { id: "evt-1", summary: "Party" };
  const { ctx, calls } = mockCtx([{ body: created }]);
  const result = await action.execute!({
    calendarId: "primary",
    summary: "Party",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    timeZone: "Europe/Berlin",
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/calendar/v3/calendars/primary/events");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.summary, "Party");
  assertEquals(body.start.dateTime, "2026-07-01T09:00:00Z");
  assertEquals(body.end.dateTime, "2026-07-01T10:00:00Z");
  assertEquals(body.start.timeZone, "Europe/Berlin");
  assertEquals(result, created);
});

Deno.test("create-event: encodes email-shaped calendar IDs", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "team@example.com",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
  }, ctx);
  const url = new URL(calls[0].url);
  // The `@` in the path segment must be percent-encoded for Google's API.
  assert(url.pathname.includes("team%40example.com/events"));
});

Deno.test("create-event: allDay switches to date-only start/end", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    allDay: true,
    start: "2026-07-01",
    end: "2026-07-02",
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.start, { date: "2026-07-01" });
  assertEquals(body.end, { date: "2026-07-02" });
});

Deno.test("create-event: fans out attendees and passes recurrence + reminders", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    attendees: ["a@x.com", "b@x.com"],
    recurrence: ["RRULE:FREQ=WEEKLY;COUNT=4"],
    useDefaultReminders: false,
    reminders: [{ method: "email", minutes: 30 }],
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.attendees, [{ email: "a@x.com" }, { email: "b@x.com" }]);
  assertEquals(body.recurrence, ["RRULE:FREQ=WEEKLY;COUNT=4"]);
  assertEquals(body.reminders, {
    useDefault: false,
    overrides: [{ method: "email", minutes: 30 }],
  });
});

Deno.test("create-event: conferenceSolution sets conferenceData and flips version query", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    conferenceSolution: "hangoutsMeet",
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.conferenceData.createRequest.conferenceSolution.type, "hangoutsMeet");
  assert(typeof body.conferenceData.createRequest.requestId === "string");
  assertEquals(new URL(calls[0].url).searchParams.get("conferenceDataVersion"), "1");
});

Deno.test("create-event: forwards sendUpdates and maxAttendees as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    sendUpdates: "all",
    maxAttendees: 10,
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("sendUpdates"), "all");
  assertEquals(params.get("maxAttendees"), "10");
});
