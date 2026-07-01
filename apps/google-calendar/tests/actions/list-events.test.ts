import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-events.ts";

Deno.test("list-events: defaults maxResults=100 and singleEvents=true", async () => {
  const body = { items: [], nextPageToken: undefined };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ calendarId: "primary" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/calendar/v3/calendars/primary/events");
  assertEquals(url.searchParams.get("maxResults"), "100");
  assertEquals(url.searchParams.get("singleEvents"), "true");
});

Deno.test("list-events: forwards every optional filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({
    calendarId: "primary",
    timeMin: "2026-07-01T00:00:00Z",
    timeMax: "2026-07-02T00:00:00Z",
    timeZone: "Europe/Berlin",
    q: "party",
    iCalUID: "uid-1",
    maxAttendees: 5,
    maxResults: 25,
    orderBy: "startTime",
    pageToken: "tok",
    showDeleted: true,
    showHiddenInvitations: true,
    singleEvents: false,
    updatedMin: "2026-06-01T00:00:00Z",
    fields: "items(id,summary)",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("timeMin"), "2026-07-01T00:00:00Z");
  assertEquals(params.get("timeMax"), "2026-07-02T00:00:00Z");
  assertEquals(params.get("timeZone"), "Europe/Berlin");
  assertEquals(params.get("q"), "party");
  assertEquals(params.get("iCalUID"), "uid-1");
  assertEquals(params.get("maxAttendees"), "5");
  assertEquals(params.get("maxResults"), "25");
  assertEquals(params.get("orderBy"), "startTime");
  assertEquals(params.get("pageToken"), "tok");
  assertEquals(params.get("showDeleted"), "true");
  assertEquals(params.get("showHiddenInvitations"), "true");
  // Caller explicitly said singleEvents=false — must be honored, not defaulted back to true.
  assertEquals(params.get("singleEvents"), "false");
  assertEquals(params.get("updatedMin"), "2026-06-01T00:00:00Z");
  assertEquals(params.get("fields"), "items(id,summary)");
});

Deno.test("list-events: encodes email calendar IDs in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ calendarId: "team@example.com" }, ctx);
  assert(new URL(calls[0].url).pathname.includes("team%40example.com/events"));
});
