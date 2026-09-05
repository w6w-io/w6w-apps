import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-template.ts";

Deno.test("delete-template: DELETEs /document_templates/{id} and reports deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ templateId: "tpl-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/document_templates/tpl-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { templateId: "tpl-1", deleted: true });
});
