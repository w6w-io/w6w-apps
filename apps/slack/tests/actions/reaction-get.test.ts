import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reaction-get.ts";

Deno.test("reaction-get: GETs /reactions.get with channel + timestamp in query", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, message: {} } }]);
  await action.execute!({ channel: "C1", timestamp: "1.1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/reactions.get");
  assertEquals(url.searchParams.get("channel"), "C1");
  assertEquals(url.searchParams.get("timestamp"), "1.1");
});
