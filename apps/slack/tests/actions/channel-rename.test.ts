import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-rename.ts";

Deno.test("channel-rename: POSTs /conversations.rename with { channel, name }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: { id: "C1" } } }]);
  await action.execute!({ channelId: "C1", name: "new-name" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.rename");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", name: "new-name" });
});
