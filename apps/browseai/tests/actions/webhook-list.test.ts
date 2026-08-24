import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: GETs /robots/{robotId}/webhooks and unwraps webhooks", async () => {
  const webhooks = {
    totalCount: 1,
    items: [{ id: "w1", url: "https://x", webhookEvent: "taskFinished", createdAt: 1 }],
  };
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("webhooks", webhooks) }]);
  const out = await webhookList.execute({ robotId: "r1" }, ctx) as typeof webhooks;

  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/webhooks");
  assertEquals(out.items[0].webhookEvent, "taskFinished");
});
