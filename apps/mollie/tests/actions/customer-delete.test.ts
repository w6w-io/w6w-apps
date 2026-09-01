import { assertEquals } from "@std/assert";
import customerDelete from "../../actions/customer-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-delete: sends DELETE to /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await customerDelete.execute({ customerId: "cst_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { customerId: "cst_1", deleted: true });
});
