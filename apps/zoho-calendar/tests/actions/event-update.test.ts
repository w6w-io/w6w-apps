import { assertEquals, assertRejects } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/event-update.ts";

Deno.test("event-update: PUTs .../events/<uid> including the mandatory etag", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [{ uid: "e1", etag: "2" }] } }]);
  const out = await action.execute(
    {
      calendarUid: "cal1",
      eventUid: "e1",
      start: "20241028T103000Z",
      end: "20241028T113000Z",
      etag: "1500285443390",
      title: "Renamed",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars/cal1/events/e1");
  const sent = JSON.parse(url.searchParams.get("eventdata")!);
  assertEquals(sent.etag, "1500285443390");
  assertEquals(sent.title, "Renamed");
  assertEquals(out, { uid: "e1", etag: "2" });
});

Deno.test("event-update: rejects without etag reaching the network", async () => {
  const { ctx, calls } = mockCalendarCtx([]);
  await assertRejects(() =>
    Promise.resolve(
      action.execute(
        { calendarUid: "cal1", eventUid: "e1", start: "a", end: "b" } as never,
        ctx,
      ),
    )
  );
  assertEquals(calls.length, 0);
});

Deno.test("event-update: rejects without start/end reaching the network", async () => {
  const { ctx, calls } = mockCalendarCtx([]);
  await assertRejects(() =>
    Promise.resolve(
      action.execute({ calendarUid: "cal1", eventUid: "e1", etag: "1" } as never, ctx),
    )
  );
  assertEquals(calls.length, 0);
});
