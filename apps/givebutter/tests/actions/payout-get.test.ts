import { assertEquals } from "@std/assert";
import payoutGet from "../../actions/payout-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payout-get: fetches /payouts/{number}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "PO-1", status: "paid" }) }]);
  const out = await payoutGet.execute({ id: "PO-1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payouts/PO-1");
  assertEquals(out, { id: "PO-1", status: "paid" });
});
