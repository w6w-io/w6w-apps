import { assertEquals } from "@std/assert";
import voucherList from "../../actions/voucher-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voucher-list: hits GET /vouchers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "vo_1" }]) }]);
  const result = await voucherList.execute({ limit: 20 }, ctx) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/vouchers");
  assertEquals(result.data.length, 1);
});
