import { assertEquals } from "@std/assert";
import orderDelete from "../../actions/order-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-delete: calls DELETE /1/Order?id=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  const out = await orderDelete.execute({ id: "1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/1/Order");
  assertEquals(queryOf(calls[0].url), { id: "1" });
  assertEquals(out.deleted, true);
});
