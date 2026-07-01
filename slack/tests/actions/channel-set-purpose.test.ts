import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-set-purpose.ts";

Deno.test("channel-set-purpose: POSTs /conversations.setPurpose with { channel, purpose }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: { id: "C1" } } }]);
  await action.execute!({ channelId: "C1", purpose: "focus channel" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.setPurpose");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", purpose: "focus channel" });
});
