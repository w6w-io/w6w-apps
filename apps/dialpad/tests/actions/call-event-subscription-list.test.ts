import { assertEquals } from "@std/assert";
import callEventSubscriptionList from "../../actions/call-event-subscription-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test(
  "call-event-subscription-list: GETs /subscriptions/call and strips the embedded webhook secret",
  async () => {
    const { ctx, calls } = mockCtx([{
      status: 200,
      body: page([{
        id: "1",
        call_states: ["hangup"],
        webhook: { id: "9", signature: { algo: "HS256", secret: "s" } },
      }]),
    }]);
    const out = await callEventSubscriptionList.execute(
      { targetType: "user", targetId: "5" },
      ctx,
    ) as {
      items: Array<{ webhook: { signature: { secret?: string } } }>;
    };
    assertEquals(pathOf(calls[0].url), "/api/v2/subscriptions/call");
    assertEquals(queryOf(calls[0].url), { target_type: "user", target_id: "5" });
    assertEquals(out.items[0].webhook.signature.secret, undefined);
  },
);

Deno.test(
  "call-event-subscription-list: an item with no webhook (websocket-backed) passes through untouched",
  async () => {
    const { ctx } = mockCtx([{ status: 200, body: page([{ id: "1", call_states: ["hangup"] }]) }]);
    const out = await callEventSubscriptionList.execute({}, ctx) as {
      items: Array<{ id: string }>;
    };
    assertEquals(out.items[0].id, "1");
  },
);
