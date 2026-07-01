import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-event.ts";

Deno.test("get-event: GETs /calendars/{id}/events/{eventId}", async () => {
  const body = { id: "evt-1", summary: "Party" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { calendarId: "primary", eventId: "evt-1" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/calendar/v3/calendars/primary/events/evt-1");
  assertEquals(result, body);
});

Deno.test("get-event: forwards optional query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    eventId: "evt-1",
    timeZone: "UTC",
    maxAttendees: 5,
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("timeZone"), "UTC");
  assertEquals(params.get("maxAttendees"), "5");
});

Deno.test("get-event: omits unset query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({ calendarId: "primary", eventId: "evt-1" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("timeZone"));
  assert(!params.has("maxAttendees"));
});
