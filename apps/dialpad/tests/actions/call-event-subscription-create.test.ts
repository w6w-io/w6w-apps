import { assertEquals } from "@std/assert";
import callEventSubscriptionCreate from "../../actions/call-event-subscription-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test(
  "call-event-subscription-create: POSTs /subscriptions/call and strips the embedded webhook secret",
  async () => {
    const { ctx, calls } = mockCtx([{
      status: 200,
      body: {
        id: "1",
        call_states: ["hangup", "connected"],
        webhook: { id: "9", signature: { algo: "HS256", secret: "s" } },
      },
    }]);
    const out = await callEventSubscriptionCreate.execute(
      { endpointId: "9", callStates: "hangup,connected", targetType: "user", targetId: "5" },
      ctx,
    ) as { webhook: { signature: { secret?: string } } };

    assertEquals(calls[0].method, "POST");
    assertEquals(pathOf(calls[0].url), "/api/v2/subscriptions/call");
    const body = JSON.parse(calls[0].body!);
    assertEquals(body.endpoint_id, 9);
    assertEquals(body.call_states, ["hangup", "connected"]);
    assertEquals(body.target_id, 5);
    assertEquals(out.webhook.signature.secret, undefined);
  },
);

Deno.test("call-event-subscription-create: declared non-idempotent", () => {
  assertEquals(callEventSubscriptionCreate.idempotent, false);
});
