import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs hookUrl/eventType and unwraps webhook", async () => {
  const webhook = { id: "w1", url: "https://x", webhookEvent: "taskFinished", createdAt: 1 };
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("webhook", webhook) }]);
  const out = await webhookCreate.execute(
    { robotId: "r1", hookUrl: "https://x", eventType: "taskFinished" },
    ctx,
  ) as typeof webhook;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), { hookUrl: "https://x", eventType: "taskFinished" });
  assertEquals(out.id, "w1");
});

/**
 * Unlike Apify's Create Webhook, Browse AI documents no idempotency key for
 * this endpoint — calling it twice registers two webhooks that both fire.
 */
Deno.test("webhook-create: is declared non-idempotent", () => {
  assertEquals(webhookCreate.idempotent, false);
});
