import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getConversation from "../../actions/get-conversation.ts";

Deno.test("get-conversation: fetches GET /conversation/{session_id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { error: false, data: { session_id: "session_x", state: "unresolved" } } },
  ], "site_1");
  const result = await getConversation.execute({ sessionId: "session_x" }, ctx);
  assertEquals(result, { session_id: "session_x", state: "unresolved" });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/conversation/session_x");
});

Deno.test("get-conversation: URL-encodes the session id", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: {} } }], "site_1");
  await getConversation.execute({ sessionId: "a/b c" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/conversation/a%2Fb%20c");
});
