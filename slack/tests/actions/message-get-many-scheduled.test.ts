import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-get-many-scheduled.ts";

Deno.test("message-get-many-scheduled: GETs /chat.scheduledMessages.list with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, scheduled_messages: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/chat.scheduledMessages.list");
  assertEquals(url.searchParams.get("limit"), "100");
});
