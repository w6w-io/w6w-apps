import { assertEquals } from "@std/assert";
import paymentCapture from "../../actions/payment-capture.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-capture: posts amount+currency to /payments/{id}/capture, defaulting currency to INR", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pay_1", status: "captured" } }]);
  const out = await paymentCapture.execute({ id: "pay_1", amount: 50000 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payments/pay_1/capture");
  assertEquals(JSON.parse(calls[0].body!), { amount: 50000, currency: "INR" });
  assertEquals(out, { id: "pay_1", status: "captured" });
});

Deno.test("payment-capture: is not idempotent — a mismatched retry can fail differently each time", () => {
  assertEquals(paymentCapture.idempotent, false);
});
