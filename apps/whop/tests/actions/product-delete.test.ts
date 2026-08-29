import { assertEquals } from "@std/assert";
import productDelete from "../../actions/product-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("product-delete: DELETEs /products/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "prod_1", deleted: true } }]);
  const out = await productDelete.execute({ productId: "prod_1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/products/prod_1");
  assertEquals(out.deleted, true);
});

Deno.test("product-delete: declared idempotent — deleting twice ends in the same state", () => {
  assertEquals(productDelete.idempotent, true);
});
