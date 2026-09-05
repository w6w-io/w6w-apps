import { assertEquals, assertRejects } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

Deno.test("event-list: GETs .../events with range JSON-encoded", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [{ uid: "e1" }] } }]);
  const out = await action.execute(
    { calendarUid: "cal1", start: "20240115T000000Z", end: "20240116T000000Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars/cal1/events");
  assertEquals(JSON.parse(url.searchParams.get("range")!), {
    start: "20240115T000000Z",
    end: "20240116T000000Z",
  });
  assertEquals(out, { events: [{ uid: "e1" }] });
});

Deno.test("event-list: passes byinstance through", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [] } }]);
  await action.execute(
    { calendarUid: "cal1", start: "20240115", end: "20240116", byInstance: true },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("byinstance"), "true");
});

Deno.test("event-list: rejects without start/end reaching the network", async () => {
  const { ctx, calls } = mockCalendarCtx([]);
  await assertRejects(() => Promise.resolve(action.execute({ calendarUid: "cal1" } as never, ctx)));
  assertEquals(calls.length, 0);
});
