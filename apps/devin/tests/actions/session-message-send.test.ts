import { assertEquals } from "@std/assert";
import sessionMessageSend from "../../actions/session-message-send.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("session-message-send: POSTs the message to /sessions/{id}/messages", async () => {
  const { ctx, calls } = mockCtx([{
    body: { session_id: "devin-1", status: "running", acus_consumed: 1.5 },
  }]);
  const out = await sessionMessageSend.execute({ devinId: "devin-1", message: "add tests" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/sessions/devin-1/messages`);
  assertEquals(JSON.parse(calls[0].body!), { message: "add tests" });
  assertEquals(out.acus_consumed, 1.5);
});

Deno.test("session-message-send: forwards attachment URLs when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { session_id: "devin-1", status: "running" } }]);
  await sessionMessageSend.execute(
    { devinId: "devin-1", message: "see attached", attachmentUrls: ["https://api.devin.ai/a/1"] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    message: "see attached",
    attachment_urls: ["https://api.devin.ai/a/1"],
  });
});

Deno.test("session-message-send: is not idempotent — resending is a second real instruction", () => {
  assertEquals(sessionMessageSend.idempotent, false);
});

Deno.test("session-message-send: requires a message", () => {
  assertEquals(sessionMessageSend.params?.find((p) => p.key === "message")?.required, true);
});
