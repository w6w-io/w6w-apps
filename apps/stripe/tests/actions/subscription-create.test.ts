import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscription-create.ts";

Deno.test("subscription-create: encodes the price as items[0][price]", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1" } }]);
  await action.execute({ customerId: "cus_1", priceId: "price_1", quantity: 2 }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/subscriptions");
  assertEquals(
    calls[0].body,
    "customer=cus_1&items%5B0%5D%5Bprice%5D=price_1&items%5B0%5D%5Bquantity%5D=2",
  );
});

Deno.test("subscription-create: passes the trial through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "cus_1", priceId: "price_1", trialPeriodDays: 14 }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("trial_period_days"), "14");
});

Deno.test("subscription-create: promotionCode nests under discounts, never as a flat promotion_code", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { customerId: "cus_1", priceId: "price_1", promotionCode: "promo_x" },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("discounts[0][promotion_code]"), "promo_x");
  assertEquals(body.has("promotion_code"), false);
});

Deno.test("subscription-create: coupon, trialEnd, default_payment_method and proration_behavior forward", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    {
      customerId: "cus_1",
      priceId: "price_1",
      coupon: "coupon_1",
      trialEnd: "now",
      defaultPaymentMethod: "pm_1",
      prorationBehavior: "none",
    },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("coupon"), "coupon_1");
  assertEquals(body.get("trial_end"), "now");
  assertEquals(body.get("default_payment_method"), "pm_1");
  assertEquals(body.get("proration_behavior"), "none");
});

Deno.test("subscription-create: omits the new fields entirely when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "cus_1", priceId: "price_1" }, ctx);
  const keys = [...new URLSearchParams(calls[0].body!).keys()];
  assertEquals(keys.sort(), ["customer", "items[0][price]"]);
});
