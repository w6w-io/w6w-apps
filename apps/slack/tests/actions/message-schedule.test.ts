import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-schedule.ts";

Deno.test("message-schedule: converts postAt to Unix seconds and sends payload", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, scheduled_message_id: "Q1" } }]);
  await action.execute!(
    { channel: "C1", postAt: "2030-01-01T00:00:00Z", text: "hi" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/chat.scheduleMessage");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.channel, "C1");
  assertEquals(body.text, "hi");
  assertEquals(body.post_at, Math.floor(new Date("2030-01-01T00:00:00Z").getTime() / 1000));
});
