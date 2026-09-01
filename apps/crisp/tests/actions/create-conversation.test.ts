import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createConversation from "../../actions/create-conversation.ts";

Deno.test("create-conversation: POSTs an empty body and returns the new session_id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { error: false, reason: "added", data: { session_id: "session_new" } } },
  ], "site_1");
  const result = await createConversation.execute({}, ctx);
  assertEquals(result, { session_id: "session_new" });
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {});
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/conversation");
});

Deno.test("create-conversation: perform, not idempotent — each call mints a new session", () => {
  assertEquals(createConversation.type, "perform");
  assertEquals(createConversation.idempotent, false);
});
