import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-company.ts";

Deno.test("delete-company: DELETEs /crm/v3/objects/companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/companies/c1");
  assertEquals(out, { id: "c1", deleted: true });
});
