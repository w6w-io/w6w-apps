import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-template.ts";

Deno.test("update-template: PUTs /document_templates/{id} with only the provided fields", async () => {
  const tpl = { id: "tpl-1", identifier: "Invoice Template v2" };
  const { ctx, calls } = mockCtx([{ body: { document_template: tpl } }]);
  const result = await action.execute!(
    { templateId: "tpl-1", bodyDraft: "<h1>Invoice #{{number}}</h1><p>Due: {{due_date}}</p>" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/document_templates/tpl-1");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(
    body.document_template.body_draft,
    "<h1>Invoice #{{number}}</h1><p>Due: {{due_date}}</p>",
  );
  assertEquals("identifier" in body.document_template, false);
  assertEquals(result, tpl);
});
