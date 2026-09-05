import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/subscription-create.ts";

Deno.test("subscription-create: builds subscribeToRatePlans from a single rate plan id", async () => {
  const { ctx, calls } = mockCtx([one({ id: "sub1" })], { display });
  await action.execute!(
    {
      accountKey: "A00000001",
      productRatePlanId: "8ad081dd9096ef9501909b40bb4e74a4",
      contractEffectiveDate: "2026-09-05",
      termType: "TERMED",
    },
    ctx,
  );
  assertEquals(calls[0].url, "https://rest.zuora.com/v1/subscriptions");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subscribeToRatePlans, [
    { productRatePlanId: "8ad081dd9096ef9501909b40bb4e74a4" },
  ]);
  assertEquals(body.termType, "TERMED");
});

Deno.test("subscription-create: passes chargeOverrides through when provided", async () => {
  const { ctx, calls } = mockCtx([one({ id: "sub1" })], { display });
  await action.execute!(
    {
      accountKey: "A1",
      productRatePlanId: "rp1",
      contractEffectiveDate: "2026-09-05",
      termType: "EVERGREEN",
      chargeOverrides: [{ productRatePlanChargeId: "c1", price: 10 }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subscribeToRatePlans[0].chargeOverrides, [
    { productRatePlanChargeId: "c1", price: 10 },
  ]);
});

Deno.test("subscription-create: sets Idempotency-Key from the invocation id", async () => {
  const { ctx, calls } = mockCtx([one({ id: "sub1" })], { display, invocationId: "inv-9" });
  await action.execute!(
    {
      accountKey: "A1",
      productRatePlanId: "rp1",
      contractEffectiveDate: "2026-09-05",
      termType: "TERMED",
    },
    ctx,
  );
  assertEquals(calls[0].headers["idempotency-key"], "inv-9");
});

Deno.test("subscription-create: never sets an authorization header — sign's job, not this action's", async () => {
  const { ctx, calls } = mockCtx([one({ id: "sub1" })], { display });
  await action.execute!(
    {
      accountKey: "A1",
      productRatePlanId: "rp1",
      contractEffectiveDate: "2026-09-05",
      termType: "TERMED",
    },
    ctx,
  );
  assert(!("authorization" in calls[0].headers));
});
