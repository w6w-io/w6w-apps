import { assertEquals } from "@std/assert";
import discountUpdate from "../../actions/discount-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("discount-update: POSTs to the resource's own URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "di_1" } }]);
  await discountUpdate.execute({ discountId: "di_1", name: "New Name" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/discounts/di_1");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("name"), "New Name");
});
