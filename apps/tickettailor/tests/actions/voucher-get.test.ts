import { assertEquals } from "@std/assert";
import voucherGet from "../../actions/voucher-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voucher-get: hits GET /vouchers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "vo_1", type: "GIFT_CARD" } }]);
  const result = await voucherGet.execute({ voucherId: "vo_1" }, ctx) as { type: string };
  assertEquals(pathOf(calls[0].url), "/v1/vouchers/vo_1");
  assertEquals(result.type, "GIFT_CARD");
});
