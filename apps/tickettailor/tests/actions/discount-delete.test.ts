import { assertEquals } from "@std/assert";
import discountDelete from "../../actions/discount-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("discount-delete: DELETEs and returns the 200 body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "di_1", object: "discount", deleted: "true" } },
  ]);
  const result = await discountDelete.execute({ discountId: "di_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/discounts/di_1");
  assertEquals(result.deleted, "true");
});
