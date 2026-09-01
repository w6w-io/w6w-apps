import { assertEquals } from "@std/assert";
import qrCodeCreate from "../../actions/qr-code-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("qr-code-create: posts to /payments/qr_codes, always pinning type=upi_qr", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "qr_1", image_url: "https://rzp.io/qr/1" } }]);
  await qrCodeCreate.execute(
    { name: "Storefront", usage: "single_use", fixedAmount: true, paymentAmount: 5000 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/payments/qr_codes");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "upi_qr",
    name: "Storefront",
    usage: "single_use",
    fixed_amount: true,
    payment_amount: 5000,
  });
});
