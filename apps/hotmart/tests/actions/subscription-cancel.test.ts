import { assertEquals, assertRejects } from "@std/assert";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-cancel - POSTs the subscriber_code path with send_mail in the body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "INACTIVE", subscriber_code: "9W2LNSG2" },
  }]);
  const out = await subscriptionCancel.execute({ subscriberCode: "9W2LNSG2", sendMail: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/payments/api/v1/subscriptions/9W2LNSG2/cancel");
  assertEquals(calls[0].body, JSON.stringify({ send_mail: true }));
  assertEquals((out as { status: string }).status, "INACTIVE");
});

Deno.test("subscription-cancel - defaults send_mail to false when omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "INACTIVE" } }]);
  await subscriptionCancel.execute({ subscriberCode: "X" }, ctx);
  assertEquals(calls[0].body, JSON.stringify({ send_mail: false }));
});

Deno.test("subscription-cancel - is declared non-idempotent", () => {
  assertEquals(subscriptionCancel.idempotent, false);
});

Deno.test("subscription-cancel - surfaces it_can_not_cancel_subscription_status", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: errorBody(
        "it_can_not_cancel_subscription_status",
        "The subscription cannot be canceled.",
      ),
    },
  ]);
  await assertRejects(
    () => Promise.resolve(subscriptionCancel.execute({ subscriberCode: "X" }, ctx)),
    Error,
    "it_can_not_cancel_subscription_status",
  );
});
