import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-join.ts";

Deno.test("channel-join: POSTs /conversations.join with channel and unwraps `channel`", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: { id: "C1" } } }]);
  const result = await action.execute!({ channelId: "C1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.join");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1" });
  assertEquals(result, { id: "C1" });
});
