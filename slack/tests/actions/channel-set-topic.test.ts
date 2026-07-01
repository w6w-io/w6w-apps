import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-set-topic.ts";

Deno.test("channel-set-topic: POSTs /conversations.setTopic with { channel, topic }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: { id: "C1" } } }]);
  await action.execute!({ channelId: "C1", topic: "chat here" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.setTopic");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", topic: "chat here" });
});
