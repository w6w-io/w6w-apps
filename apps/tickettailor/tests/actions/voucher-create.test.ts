import { assertEquals } from "@std/assert";
import voucherCreate from "../../actions/voucher-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voucher-create: sends codes as repeated codes[] fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "vo_1" } }]);
  await voucherCreate.execute(
    { name: "Launch gift card", value: 5000, voucherType: "GIFT_CARD", codes: "AAA,BBB" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/vouchers");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("voucher_type"), "GIFT_CARD");
  assertEquals(body.getAll("codes[]"), ["AAA", "BBB"]);
});
