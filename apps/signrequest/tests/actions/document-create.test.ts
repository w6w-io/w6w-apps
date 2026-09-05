import { assertEquals } from "@std/assert";
import documentCreate from "../../actions/document-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-create: POSTs /documents/ with file_from_url", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "doc-1", name: "NDA.pdf" } }]);
  const out = await documentCreate.execute({
    name: "NDA.pdf",
    fileFromUrl: "https://example.com/nda.pdf",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v1/documents/");
  assertEquals(bodyOf(calls[0]), { name: "NDA.pdf", file_from_url: "https://example.com/nda.pdf" });
  assertEquals(out.uuid, "doc-1");
});

Deno.test("document-create: converts templateId into a full template resource URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "doc-2" } }]);
  await documentCreate.execute({ templateId: "tpl-1" }, ctx);
  assertEquals(
    bodyOf(calls[0]).template,
    "https://signrequest.com/api/v1/templates/tpl-1/",
  );
});

Deno.test("document-create: parses prefillTags JSON and drops empty optional fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "doc-3" } }]);
  await documentCreate.execute({
    fileFromContent: "base64==",
    fileFromContentName: "doc.pdf",
    prefillTags: '[{"external_id":"city","text":"NYC"}]',
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.prefill_tags, [{ external_id: "city", text: "NYC" }]);
  assertEquals("fileFromUrl" in body, false);
  assertEquals("templateId" in body, false);
});
