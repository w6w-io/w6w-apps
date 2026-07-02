import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-message.ts";

Deno.test("send-message: POSTs /channels/{id}/messages with content", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ channelId: "c1", content: "hi" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/channels/c1/messages");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, "hi");
});

Deno.test("send-message: replyToMessageId maps to message_reference.message_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ channelId: "c1", content: "hi", replyToMessageId: "orig-1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message_reference, { message_id: "orig-1" });
});

Deno.test("send-message: forwards embeds/flags/tts verbatim, omits undefined content", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    {
      channelId: "c1",
      embeds: [{ title: "hi", description: "world" }],
      flags: 4096,
      tts: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.embeds, [{ title: "hi", description: "world" }]);
  assertEquals(body.flags, 4096);
  assertEquals(body.tts, true);
  assert(!("content" in body), "must not send content when caller omitted it");
});
