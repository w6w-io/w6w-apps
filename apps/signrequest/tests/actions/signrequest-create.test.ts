import { assertEquals, assertThrows } from "@std/assert";
import signrequestCreate from "../../actions/signrequest-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("signrequest-create: POSTs /signrequests/ with the document resource URL and parsed signers", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "sr-1" } }]);
  await signrequestCreate.execute({
    documentId: "doc-1",
    signers: '[{"email":"signer@example.com"}]',
    fromEmail: "sender@example.com",
    who: "o",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v1/signrequests/");
  const body = bodyOf(calls[0]);
  assertEquals(body.document, "https://signrequest.com/api/v1/documents/doc-1/");
  assertEquals(body.signers, [{ email: "signer@example.com" }]);
  assertEquals(body.from_email, "sender@example.com");
  assertEquals(body.who, "o");
});

Deno.test("signrequest-create: passes disable_* booleans through by wire name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "sr-2" } }]);
  await signrequestCreate.execute({
    documentId: "doc-1",
    signers: "[]",
    disableEmails: true,
    disableAttachments: false,
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.disable_emails, true);
  assertEquals(body.disable_attachments, false);
});

Deno.test("signrequest-create: throws with the param name when signers isn't a JSON array", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => signrequestCreate.execute({ documentId: "doc-1", signers: "not json" }, ctx),
  );
});
