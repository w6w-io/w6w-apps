import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-event.ts";

Deno.test("delete-event: DELETEs /calendars/{id}/events/{eventId} and returns success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await action.execute!(
    { calendarId: "primary", eventId: "evt-1" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/calendar/v3/calendars/primary/events/evt-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});

Deno.test("delete-event: forwards sendUpdates", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({
    calendarId: "primary",
    eventId: "evt-1",
    sendUpdates: "externalOnly",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("sendUpdates"), "externalOnly");
});
