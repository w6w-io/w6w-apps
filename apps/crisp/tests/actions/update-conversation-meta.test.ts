import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updateConversationMeta from "../../actions/update-conversation-meta.ts";

Deno.test("update-conversation-meta: PATCHes only the fields set, comma-splits segments", async () => {
  const { ctx, calls } = mockCtx([
    { body: { error: false, reason: "updated", data: {} } },
  ], "site_1");
  await updateConversationMeta.execute({
    sessionId: "session_x",
    nickname: "John Doe",
    email: "john.doe@acme-inc.com",
    segments: "happy, customer, love",
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    nickname: "John Doe",
    email: "john.doe@acme-inc.com",
    segments: ["happy", "customer", "love"],
  });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/conversation/session_x/meta");
});

Deno.test("update-conversation-meta: omits unset optional fields from the body entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: {} } }], "site_1");
  await updateConversationMeta.execute({ sessionId: "session_x", subject: "Refund" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { subject: "Refund" });
});
