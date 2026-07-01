import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-availability.ts";

const T_MIN = "2026-07-01T09:00:00Z";
const T_MAX = "2026-07-01T10:00:00Z";

Deno.test("get-availability: POSTs to /freeBusy with the calendar and interval", async () => {
  const { ctx, calls } = mockCtx([
    { body: { calendars: { primary: { busy: [] } } } },
  ]);
  const result = await action.execute!({
    calendarId: "primary",
    timeMin: T_MIN,
    timeMax: T_MAX,
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/calendar/v3/freeBusy");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.timeMin, T_MIN);
  assertEquals(body.timeMax, T_MAX);
  assertEquals(body.items, [{ id: "primary" }]);
  // Default output shape: an `available` boolean.
  assertEquals(result, { available: true });
});

Deno.test("get-availability: `bookedSlots` returns just the busy array", async () => {
  const busy = [{ start: T_MIN, end: T_MAX }];
  const { ctx } = mockCtx([{ body: { calendars: { primary: { busy } } } }]);
  const result = await action.execute!({
    calendarId: "primary",
    timeMin: T_MIN,
    timeMax: T_MAX,
    outputFormat: "bookedSlots",
  }, ctx);
  assertEquals(result, busy);
});

Deno.test("get-availability: `raw` passes through the FreeBusy payload", async () => {
  const raw = { timeMin: T_MIN, timeMax: T_MAX, calendars: { primary: { busy: [] } } };
  const { ctx } = mockCtx([{ body: raw }]);
  const result = await action.execute!({
    calendarId: "primary",
    timeMin: T_MIN,
    timeMax: T_MAX,
    outputFormat: "raw",
  }, ctx);
  assertEquals(result, raw);
});

Deno.test("get-availability: bubbles up per-calendar errors from FreeBusy", async () => {
  const { ctx } = mockCtx([{
    body: { calendars: { primary: { errors: [{ domain: "global", reason: "notFound" }] } } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({ calendarId: "primary", timeMin: T_MIN, timeMax: T_MAX }, ctx),
    Error,
    "notFound",
  );
});

Deno.test("get-availability: `available` flips to false when there are busy slots", async () => {
  const busy = [{ start: T_MIN, end: T_MAX }];
  const { ctx } = mockCtx([{ body: { calendars: { primary: { busy } } } }]);
  const result = await action.execute!({
    calendarId: "primary",
    timeMin: T_MIN,
    timeMax: T_MAX,
  }, ctx);
  assertEquals(result, { available: false });
});

Deno.test("get-availability: forwards the caller time zone", async () => {
  const { ctx, calls } = mockCtx([{ body: { calendars: { primary: { busy: [] } } } }]);
  await action.execute!({
    calendarId: "primary",
    timeMin: T_MIN,
    timeMax: T_MAX,
    timeZone: "Europe/Berlin",
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.timeZone, "Europe/Berlin");
  assert(body.items[0].id === "primary");
});
