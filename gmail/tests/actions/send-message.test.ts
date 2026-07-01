import { assertEquals, assertStringIncludes } from "@std/assert";
import { decodeBase64Url } from "@std/encoding/base64url";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-message.ts";

Deno.test("send-message: POSTs a base64url MIME to messages/send", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "msg-1", threadId: "t-1" } }]);
  const result = await action.execute!({
    to: "a@b.com",
    subject: "hi",
    text: "hello",
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/messages/send");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  const decoded = new TextDecoder().decode(decodeBase64Url(body.raw));
  assertStringIncludes(decoded, "To: a@b.com");
  assertStringIncludes(decoded, "Subject: hi");
  assertStringIncludes(decoded, "hello");
  assertEquals((result as { id: string }).id, "msg-1");
});

Deno.test("send-message: forwards threadId when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "msg-2" } }]);
  await action.execute!({ to: "a@b.com", text: "x", threadId: "T99" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.threadId, "T99");
});
