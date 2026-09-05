import { assertEquals } from "@std/assert";
import voucherDelete from "../../actions/voucher-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voucher-delete: DELETEs and returns the 200 body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "vo_1", object: "voucher", deleted: "true" } },
  ]);
  const result = await voucherDelete.execute({ voucherId: "vo_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/vouchers/vo_1");
  assertEquals(result.deleted, "true");
});
