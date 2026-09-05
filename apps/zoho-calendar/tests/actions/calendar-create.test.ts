import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/calendar-create.ts";

Deno.test("calendar-create: POSTs /calendars with calendarData as a query param, not a body", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [{ uid: "new-uid" }] } }]);
  const out = await action.execute({ name: "New Calendar", color: "#101010" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars");
  const sent = JSON.parse(url.searchParams.get("calendarData")!);
  assertEquals(sent, { name: "New Calendar", color: "#101010" });
  assertEquals(out, { uid: "new-uid" });
});

Deno.test("calendar-create: includes optional fields, snake_cased where Zoho expects it", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [{ uid: "x" }] } }]);
  await action.execute(
    { name: "N", color: "#000000", includeInFreebusy: false, timezone: "Asia/Kolkata" },
    ctx,
  );
  const sent = JSON.parse(new URL(calls[0].url).searchParams.get("calendarData")!);
  assertEquals(sent.include_infreebusy, false);
  assertEquals(sent.timezone, "Asia/Kolkata");
});

Deno.test("calendar-create: rejects without name and color reaching the network", async () => {
  const { ctx, calls } = mockCalendarCtx([]);
  await assertRejects(() => Promise.resolve(action.execute({} as never, ctx)));
  assertEquals(calls.length, 0);
});

Deno.test("calendar-create: never sends the payload as a request body", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [{ uid: "x" }] } }]);
  await action.execute({ name: "N", color: "#000000" }, ctx);
  assert(calls[0].body === null, "expected no request body");
});
