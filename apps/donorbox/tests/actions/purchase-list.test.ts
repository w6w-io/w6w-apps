import { assertEquals } from "@std/assert";
import purchaseList from "../../actions/purchase-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("purchase-list: hits /api/v1/purchases", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 231234, status: "paid" }] }]);
  const out = await purchaseList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/purchases");
  assertEquals((out as { data: unknown[] }).data.length, 1);
});

Deno.test("purchase-list: passes payment_status through, one of the four documented values", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await purchaseList.execute({ payment_status: "refunded" }, ctx);
  assertEquals(queryOf(calls[0].url).payment_status, "refunded");
});

Deno.test("purchase-list: the select param defaults to succeeded", () => {
  const param = purchaseList.params?.find((p) => p.key === "payment_status");
  assertEquals(param?.default, "succeeded");
});
