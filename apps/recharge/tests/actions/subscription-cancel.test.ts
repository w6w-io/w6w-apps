import { assertEquals } from "@std/assert";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-cancel: POSTs to /subscriptions/{id}/cancel with the reason", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("subscription", { id: 1, status: "cancelled" }) },
  ]);
  await subscriptionCancel.execute(
    { subscriptionId: "1", cancellationReason: "other reason", sendEmail: false },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/subscriptions/1/cancel");
  assertEquals(
    JSON.parse(calls[0].body!),
    { cancellation_reason: "other reason", send_email: false },
  );
});

Deno.test("subscription-cancel: not marked idempotent", () => {
  assertEquals(subscriptionCancel.idempotent, false);
});
