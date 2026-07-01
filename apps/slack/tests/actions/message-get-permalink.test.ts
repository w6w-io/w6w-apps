import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-get-permalink.ts";

Deno.test("message-get-permalink: GETs /chat.getPermalink with channel + message_ts", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, permalink: "https://slack.example/…" } }]);
  await action.execute!({ channel: "C1", ts: "1.1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/chat.getPermalink");
  assertEquals(url.searchParams.get("channel"), "C1");
  assertEquals(url.searchParams.get("message_ts"), "1.1");
});
