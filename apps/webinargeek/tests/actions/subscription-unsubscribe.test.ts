import { assertEquals } from "@std/assert";
import subscriptionUnsubscribe from "../../actions/subscription-unsubscribe.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-unsubscribe: POSTs to /subscriptions/{id}/unsubscribe", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, unsubscribed: true } }]);
  const out = await subscriptionUnsubscribe.execute({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/subscriptions/1/unsubscribe");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { id: 1, unsubscribed: true });
});

Deno.test("subscription-unsubscribe: is declared idempotent", () => {
  assertEquals(subscriptionUnsubscribe.idempotent, true);
});
