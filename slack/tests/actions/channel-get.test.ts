import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-get.ts";

Deno.test("channel-get: POSTs /conversations.info with channel in query", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channel: { id: "C1" } } }]);
  const result = await action.execute!({ channelId: "C1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/conversations.info");
  assertEquals(url.searchParams.get("channel"), "C1");
  assertEquals(calls[0].method, "POST");
  assertEquals(result, { id: "C1" });
});
