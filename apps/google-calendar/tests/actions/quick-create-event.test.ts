import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quick-create-event.ts";

Deno.test("quick-create-event: POSTs to /events/quickAdd with text as a query param", async () => {
  const created = { id: "evt-1", summary: "Coffee with Sam" };
  const { ctx, calls } = mockCtx([{ body: created }]);
  const result = await action.execute!(
    { calendarId: "primary", text: "Coffee with Sam tomorrow at 3pm" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/calendar/v3/calendars/primary/events/quickAdd");
  // `text` rides as a query param — that's what `events.quickAdd` requires.
  assertEquals(url.searchParams.get("text"), "Coffee with Sam tomorrow at 3pm");
  assertEquals(calls[0].method, "POST");
  assertEquals(result, created);
});

Deno.test("quick-create-event: forwards sendUpdates", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    text: "Lunch tomorrow",
    sendUpdates: "all",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("sendUpdates"), "all");
});
