import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-delete: form_id is a query param, not a path segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await contactDelete.execute({ contactId: "c1", formId: "f1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/contacts/c1");
  assertEquals(queryOf(calls[0].url), { form_id: "f1" });
});
