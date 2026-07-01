import { assertEquals, assertStringIncludes } from "@std/assert";
import { decodeBase64Url } from "@std/encoding/base64url";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-draft.ts";

Deno.test("create-draft: POSTs users/me/drafts with { message: { raw } }", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await action.execute!({ to: "a@b.com", subject: "s", text: "body" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/drafts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(typeof body.message.raw, "string");
  const decoded = new TextDecoder().decode(decodeBase64Url(body.message.raw));
  assertStringIncludes(decoded, "Subject: s");
  assertStringIncludes(decoded, "body");
});

Deno.test("create-draft: attaches threadId inside message when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d2" } }]);
  await action.execute!({ to: "a@b.com", text: "x", threadId: "T1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.threadId, "T1");
});
