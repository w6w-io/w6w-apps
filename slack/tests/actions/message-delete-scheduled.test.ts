import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-delete-scheduled.ts";

Deno.test("message-delete-scheduled: POSTs /chat.deleteScheduledMessage with scheduled_message_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channel: "C1", scheduledMessageId: "Q1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/chat.deleteScheduledMessage");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", scheduled_message_id: "Q1" });
});
