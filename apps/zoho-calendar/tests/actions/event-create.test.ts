import { assertEquals, assertRejects } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/event-create.ts";

Deno.test("event-create: POSTs .../events with eventdata as a query param", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [{ uid: "e1", etag: "1" }] } }]);
  const out = await action.execute(
    {
      calendarUid: "cal1",
      start: "20241028T103000Z",
      end: "20241028T113000Z",
      title: "Standup",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars/cal1/events");
  const sent = JSON.parse(url.searchParams.get("eventdata")!);
  assertEquals(sent, {
    title: "Standup",
    dateandtime: { start: "20241028T103000Z", end: "20241028T113000Z" },
  });
  assertEquals(out, { uid: "e1", etag: "1" });
});

Deno.test("event-create: nests timezone under dateandtime, not top-level", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [{ uid: "e1" }] } }]);
  await action.execute(
    {
      calendarUid: "cal1",
      start: "20241028T103000Z",
      end: "20241028T113000Z",
      timezone: "Asia/Kolkata",
    },
    ctx,
  );
  const sent = JSON.parse(new URL(calls[0].url).searchParams.get("eventdata")!);
  assertEquals(sent.dateandtime.timezone, "Asia/Kolkata");
  assertEquals(sent.timezone, undefined);
});

Deno.test("event-create: rejects without start/end reaching the network", async () => {
  const { ctx, calls } = mockCalendarCtx([]);
  await assertRejects(() => Promise.resolve(action.execute({ calendarUid: "cal1" } as never, ctx)));
  assertEquals(calls.length, 0);
});
