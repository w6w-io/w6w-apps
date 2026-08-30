import { assertEquals } from "@std/assert";
import pageFormFieldList from "../../actions/page-form-field-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("page-form-field-list: calls GET /pages/{id}/form_fields with no offset/limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { form_fields: [] } }]);
  await pageFormFieldList.execute({ pageId: "p1", includeSubPages: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/pages/p1/form_fields");
  assertEquals(queryOf(calls[0].url), { include_sub_pages: "true" });
});
