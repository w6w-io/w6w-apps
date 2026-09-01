import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listMessages from "../../actions/list-messages.ts";

Deno.test("list-messages: fetches GET /conversation/{session_id}/messages with paging params", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: [] } }], "site_1");
  await listMessages.execute({ sessionId: "session_x", timestampBefore: 1000 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/conversation/session_x/messages");
  assertEquals(url.searchParams.get("timestamp_before"), "1000");
  assertEquals(url.searchParams.has("timestamp_after"), false);
  assertEquals(url.searchParams.has("timestamp_around"), false);
});

Deno.test("list-messages: returns the message batch verbatim", async () => {
  const { ctx } = mockCtx([
    { body: { error: false, data: [{ fingerprint: 1, type: "text", content: "hi" }] } },
  ], "site_1");
  const result = await listMessages.execute({ sessionId: "session_x" }, ctx);
  assertEquals(result, [{ fingerprint: 1, type: "text", content: "hi" }]);
});
