import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs to /v2.1/webhooks", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ type: "call.completed", url_count: 1, webhook_urls: [] }) },
  ]);
  await webhookCreate.execute(
    { type: "call.completed", webhook_url: "https://example.com/hook" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2.1/webhooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "call.completed",
    webhook_url: "https://example.com/hook",
  });
});

Deno.test("webhook-create: is declared non-idempotent — the vendor documents no dedupe", () => {
  assertEquals(webhookCreate.idempotent, false);
});
