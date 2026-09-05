import { assertEquals, assertRejects } from "@std/assert";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/event-delete.ts";

Deno.test("event-delete: DELETEs .../events/<uid> with uid+etag in eventdata", async () => {
  const { ctx, calls } = mockCalendarCtx([
    { body: { events: [{ uid: "e1", estatus: "deleted" }] } },
  ]);
  const out = await action.execute(
    { calendarUid: "cal1", eventUid: "e1", etag: "1480397612447" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/calendars/cal1/events/e1");
  const sent = JSON.parse(url.searchParams.get("eventdata")!);
  assertEquals(sent, { uid: "e1", etag: "1480397612447" });
  assertEquals(out, { uid: "e1", estatus: "deleted" });
});

Deno.test("event-delete: includes recurrenceId/recurrenceEditType when set", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [{ uid: "e1" }] } }]);
  await action.execute(
    {
      calendarUid: "cal1",
      eventUid: "e1",
      etag: "1",
      recurrenceId: "20230825T073000Z",
      recurrenceEditType: "only",
    },
    ctx,
  );
  const sent = JSON.parse(new URL(calls[0].url).searchParams.get("eventdata")!);
  assertEquals(sent.recurrenceid, "20230825T073000Z");
  assertEquals(sent.recurrence_edittype, "only");
});

Deno.test("event-delete: rejects without etag reaching the network", async () => {
  const { ctx, calls } = mockCalendarCtx([]);
  await assertRejects(() =>
    Promise.resolve(action.execute({ calendarUid: "cal1", eventUid: "e1" } as never, ctx))
  );
  assertEquals(calls.length, 0);
});
