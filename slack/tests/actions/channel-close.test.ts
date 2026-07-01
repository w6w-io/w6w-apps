import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-close.ts";

Deno.test("channel-close: POSTs /conversations.close with { channel }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channelId: "D1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.close");
  assertEquals(JSON.parse(calls[0].body!), { channel: "D1" });
});
