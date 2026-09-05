import { assertEquals } from "@std/assert";
import voucherCodeVoid from "../../actions/voucher-code-void.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voucher-code-void: POSTs to the nested void path", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "vc_1", object: "voucher_code", voided: "true" } },
  ]);
  const result = await voucherCodeVoid.execute(
    { voucherId: "vo_1", voucherCodeId: "vc_1" },
    ctx,
  ) as {
    voided: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/vouchers/vo_1/codes/vc_1/void");
  assertEquals(result.voided, "true");
});
