import { assertEquals, assertRejects } from "@std/assert";
import subscriptionReactivate from "../../actions/subscription-reactivate.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-reactivate - POSTs the subscriber_code path with charge in the body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "INACTIVE", subscriber_code: "9W2LNSG2" },
  }]);
  const out = await subscriptionReactivate.execute(
    { subscriberCode: "9W2LNSG2", charge: true },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/payments/api/v1/subscriptions/9W2LNSG2/reactivate");
  assertEquals(calls[0].body, JSON.stringify({ charge: true }));
  assertEquals((out as { status: string }).status, "INACTIVE");
});

Deno.test("subscription-reactivate - defaults charge to false when omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "INACTIVE" } }]);
  await subscriptionReactivate.execute({ subscriberCode: "X" }, ctx);
  assertEquals(calls[0].body, JSON.stringify({ charge: false }));
});

Deno.test("subscription-reactivate - is declared non-idempotent", () => {
  assertEquals(subscriptionReactivate.idempotent, false);
});

Deno.test("subscription-reactivate - surfaces it_can_not_reactivate_subscription", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: errorBody(
        "it_can_not_reactivate_subscription",
        "The subscription cannot be reactivated.",
      ),
    },
  ]);
  await assertRejects(
    () => Promise.resolve(subscriptionReactivate.execute({ subscriberCode: "X" }, ctx)),
    Error,
    "it_can_not_reactivate_subscription",
  );
});
