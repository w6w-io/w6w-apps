import { assertEquals } from "@std/assert";
import chargeRefund from "../../actions/charge-refund.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("charge-refund: POSTs the amount to /charges/{id}/refund", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("charge", { id: 1, status: "refunded" }) },
  ]);
  await chargeRefund.execute({ chargeId: "1", amount: "10.00", fullRefund: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/charges/1/refund");
  assertEquals(JSON.parse(calls[0].body!), { amount: "10.00", full_refund: true });
});

Deno.test("charge-refund: includes retry/error/errorType only when the caller supplies them", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("charge", { id: 1, status: "error" }) }]);
  await chargeRefund.execute(
    {
      chargeId: "1",
      amount: "10.00",
      fullRefund: true,
      retry: true,
      error: "insufficient_inventory",
      errorType: "inventory",
    },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!),
    {
      amount: "10.00",
      full_refund: true,
      retry: true,
      error: "insufficient_inventory",
      error_type: "inventory",
    },
  );
});
