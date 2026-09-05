import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/payment-update.ts";

Deno.test("payment-update: PUTs /payments/{id} with only the set fields", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "p1" } }]);
  await action.execute({ paymentId: "p1", transactionReference: "ref-1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.transaction_reference, "ref-1");
  assertEquals(body.date, undefined);
});
