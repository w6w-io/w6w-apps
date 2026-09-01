import { assertEquals } from "@std/assert";
import paymentLinkCreate from "../../actions/payment-link-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-link-create: posts to /payment_links, nesting customer/notify objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plink_1", short_url: "https://rzp.io/i/abc" } }]);
  const out = await paymentLinkCreate.execute(
    {
      amount: 50000,
      customerName: "Aisha",
      customerEmail: "aisha@example.com",
      notifySms: true,
      notifyEmail: false,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/payment_links");
  assertEquals(JSON.parse(calls[0].body!), {
    amount: 50000,
    customer: { name: "Aisha", email: "aisha@example.com" },
    notify: { sms: true, email: false },
  });
  assertEquals(out, { id: "plink_1", short_url: "https://rzp.io/i/abc" });
});

Deno.test("payment-link-create: omits customer/notify entirely when no sub-fields are set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plink_2" } }]);
  await paymentLinkCreate.execute({ amount: 10000 }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals("customer" in body, false);
  assertEquals("notify" in body, false);
});
