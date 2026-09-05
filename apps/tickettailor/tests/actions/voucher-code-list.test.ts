import { assertEquals } from "@std/assert";
import voucherCodeList from "../../actions/voucher-code-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voucher-code-list: hits GET /vouchers/{id}/codes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "vc_1" }]) }]);
  const result = await voucherCodeList.execute({ voucherId: "vo_1" }, ctx) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/vouchers/vo_1/codes");
  assertEquals(result.data.length, 1);
});
