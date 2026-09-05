import { assertEquals } from "@std/assert";
import signrequestQuickCreate from "../../actions/signrequest-quick-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("signrequest-quick-create: POSTs /signrequest-quick-create/ with parsed signers and document fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { uuid: "sr-1", document: "https://signrequest.com/api/v1/documents/doc-1/" },
  }]);
  const out = await signrequestQuickCreate.execute({
    signers: '[{"email":"signer@example.com"}]',
    fileFromUrl: "https://example.com/nda.pdf",
    fromEmail: "sender@example.com",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v1/signrequest-quick-create/");
  const body = bodyOf(calls[0]);
  assertEquals(body.signers, [{ email: "signer@example.com" }]);
  assertEquals(body.file_from_url, "https://example.com/nda.pdf");
  assertEquals(out.uuid, "sr-1");
});

Deno.test("signrequest-quick-create: converts templateId into a full template resource URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "sr-2" } }]);
  await signrequestQuickCreate.execute({ signers: "[]", templateId: "tpl-1" }, ctx);
  assertEquals(bodyOf(calls[0]).template, "https://signrequest.com/api/v1/templates/tpl-1/");
});
