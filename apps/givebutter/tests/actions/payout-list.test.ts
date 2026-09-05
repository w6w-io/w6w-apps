import { assertEquals } from "@std/assert";
import payoutList from "../../actions/payout-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

Deno.test("payout-list: hits /payouts", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "PO-1" }]) }]);
  await payoutList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/payouts");
});
