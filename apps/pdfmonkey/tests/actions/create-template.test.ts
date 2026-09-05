import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-template.ts";

Deno.test("create-template: POSTs /document_templates with app_id and identifier", async () => {
  const tpl = { id: "tpl-1", identifier: "Invoice Template" };
  const { ctx, calls } = mockCtx([{ status: 201, body: { document_template: tpl } }]);
  const result = await action.execute!(
    {
      workspaceId: "ws-1",
      identifier: "Invoice Template",
      bodyDraft: "<h1>Invoice #{{number}}</h1>",
      settingsDraft: { paper_format: "a4" },
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/document_templates");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.document_template.app_id, "ws-1");
  assertEquals(body.document_template.identifier, "Invoice Template");
  assertEquals(body.document_template.body_draft, "<h1>Invoice #{{number}}</h1>");
  assertEquals(body.document_template.settings_draft, { paper_format: "a4" });
  assertEquals(result, tpl);
});

Deno.test("create-template: omits unset optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { document_template: { id: "tpl-1" } } }]);
  await action.execute!({ workspaceId: "ws-1", identifier: "Blank" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("pdf_engine_id" in body.document_template, false);
  assertEquals("edition_mode" in body.document_template, false);
});
