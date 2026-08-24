import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-custom-fields.ts";

Deno.test("list-custom-fields: is a read action", () => {
  assertEquals(action.type, "read");
});

Deno.test("list-custom-fields: GETs /categories/custom_fields with the document type filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { custom_fields: [] } }]);
  await action.execute({ documentType: "Contact" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/categories/custom_fields");
  assertEquals(url.searchParams.get("document_type"), "Contact");
});
