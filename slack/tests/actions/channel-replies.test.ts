import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-replies.ts";

Deno.test("channel-replies: GETs /conversations.replies with channel and ts", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, messages: [] } }]);
  await action.execute!({ channelId: "C1", ts: "123.456" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/conversations.replies");
  assertEquals(url.searchParams.get("channel"), "C1");
  assertEquals(url.searchParams.get("ts"), "123.456");
  assertEquals(url.searchParams.get("limit"), "100");
});
