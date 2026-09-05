import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/order-create.ts";

const SUBSCRIPTIONS = [{
  orderActions: [{
    type: "CreateSubscription",
    createSubscription: {
      terms: {
        initialTerm: { period: 12, periodType: "Month", termType: "TERMED" },
        renewalSetting: "RENEW_WITH_SPECIFIC_TERM",
        renewalTerms: [{ period: 12, periodType: "Month" }],
      },
      subscribeToRatePlans: [{ productRatePlanId: "8ad081dd9096ef9501909b40bb4e74a4" }],
    },
  }],
}];

Deno.test("order-create: POSTs existingAccountId (not Number) when that key type is chosen", async () => {
  const { ctx, calls } = mockCtx([one({ id: "ord1" })], { display });
  await action.execute!(
    {
      existingAccountKeyType: "existingAccountId",
      existingAccountKey: "8ad0…acc1",
      orderDate: "2026-09-05",
      subscriptions: SUBSCRIPTIONS,
    },
    ctx,
  );
  assertEquals(calls[0].url, "https://rest.zuora.com/v1/orders");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.existingAccountId, "8ad0…acc1");
  assert(!("existingAccountNumber" in body));
  assertEquals(body.subscriptions, SUBSCRIPTIONS);
});

Deno.test("order-create: POSTs existingAccountNumber when that key type is chosen", async () => {
  const { ctx, calls } = mockCtx([one({ id: "ord1" })], { display });
  await action.execute!(
    {
      existingAccountKeyType: "existingAccountNumber",
      existingAccountKey: "A00000097",
      orderDate: "2026-09-05",
      subscriptions: SUBSCRIPTIONS,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.existingAccountNumber, "A00000097");
  assert(!("existingAccountId" in body));
});

Deno.test("order-create: sets Idempotency-Key from the invocation id", async () => {
  const { ctx, calls } = mockCtx([one({ id: "ord1" })], { display, invocationId: "inv-7" });
  await action.execute!(
    {
      existingAccountKeyType: "existingAccountId",
      existingAccountKey: "acc1",
      orderDate: "2026-09-05",
      subscriptions: SUBSCRIPTIONS,
    },
    ctx,
  );
  assertEquals(calls[0].headers["idempotency-key"], "inv-7");
});
