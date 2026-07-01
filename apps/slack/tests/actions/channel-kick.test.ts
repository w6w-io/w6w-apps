import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-kick.ts";

Deno.test("channel-kick: POSTs /conversations.kick with { channel, user }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channelId: "C1", userId: "U1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.kick");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", user: "U1" });
});
