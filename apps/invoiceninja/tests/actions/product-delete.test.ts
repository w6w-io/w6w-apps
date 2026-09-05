import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/product-delete.ts";

Deno.test("product-delete: DELETEs /products/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ status: 204 }]);
  const out = await action.execute({ productId: "prod1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/products/prod1");
  assertEquals(out, {});
});
