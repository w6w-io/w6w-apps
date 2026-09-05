import { assertEquals } from "@std/assert";
import subscriptionCreate from "../../actions/subscription-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-create: POSTs to /subscriptions with a nested external_variant_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope("subscription", { id: 1 }) }]);
  await subscriptionCreate.execute(
    {
      addressId: 48563471,
      externalVariantId: "32165284380775",
      quantity: 3,
      orderIntervalFrequency: 30,
      orderIntervalUnit: "day",
      chargeIntervalFrequency: 30,
      nextChargeScheduledAt: "2026-12-17",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/subscriptions");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.address_id, 48563471);
  assertEquals(body.external_variant_id, { ecommerce: "32165284380775" });
  assertEquals(body.order_interval_unit, "day");
});

Deno.test("subscription-create: is a non-idempotent perform action", () => {
  assertEquals(subscriptionCreate.idempotent, false);
});
