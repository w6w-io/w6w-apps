import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-archive.ts";

Deno.test("channel-archive: POSTs /conversations.archive with { channel }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const result = await action.execute!({ channelId: "C1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.archive");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1" });
  assertEquals((result as { ok: boolean }).ok, true);
});
