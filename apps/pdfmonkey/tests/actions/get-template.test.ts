import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-template.ts";

Deno.test("get-template: GETs /document_templates/{id} and unwraps document_template", async () => {
  const tpl = { id: "tpl-1", identifier: "My Awesome Template", body: "<p>Hello</p>" };
  const { ctx, calls } = mockCtx([{ body: { document_template: tpl } }]);
  const result = await action.execute!({ templateId: "tpl-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/document_templates/tpl-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, tpl);
});
