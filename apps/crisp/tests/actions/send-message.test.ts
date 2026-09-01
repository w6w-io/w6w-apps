import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import sendMessage from "../../actions/send-message.ts";

Deno.test("send-message: POSTs the text/from/origin/content body and returns the fingerprint", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 202,
      body: { error: false, reason: "dispatched", data: { fingerprint: 150912675256156 } },
    },
  ], "site_1");
  const result = await sendMessage.execute({
    sessionId: "session_x",
    type: "text",
    from: "operator",
    origin: "chat",
    content: "Hey there! Need help?",
  }, ctx);
  assertEquals(result, { fingerprint: 150912675256156 });
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "text",
    from: "operator",
    origin: "chat",
    content: "Hey there! Need help?",
  });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/conversation/session_x/message");
});

Deno.test("send-message: supports the note type unchanged", async () => {
  const { ctx, calls } = mockCtx([
    { status: 202, body: { error: false, data: { fingerprint: 2 } } },
  ], "site_1");
  await sendMessage.execute({
    sessionId: "session_x",
    type: "note",
    from: "operator",
    origin: "chat",
    content: "internal note",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).type, "note");
});

Deno.test("send-message: perform, not idempotent — retrying would send it twice", () => {
  assertEquals(sendMessage.type, "perform");
  assertEquals(sendMessage.idempotent, false);
});
