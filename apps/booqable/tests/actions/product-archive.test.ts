import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-archive.ts";

Deno.test("product-archive: DELETEs /products/{id} (a soft archive, not a hard delete)", async () => {
  const { ctx, calls } = mockBooqableCtx([{
    body: { data: { id: "p1", attributes: { archived: true } } },
  }]);
  const out = await action.execute({ productId: "p1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/products/p1");
  assertEquals(
    (out as { data: { attributes: { archived: boolean } } }).data.attributes.archived,
    true,
  );
});
