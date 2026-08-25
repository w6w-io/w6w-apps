import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: a bare URL with no scoping numbers posts a plain string entry", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", webhooks: {} } }]);
  await webhookCreate.execute({ url: "https://example.com/hook", type: "receive" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/account/webhooks");
  assertEquals(jsonBodyOf(calls[0]), {
    webhooks: ["https://example.com/hook"],
    type: "receive",
  });
});

Deno.test("webhook-create: scoping to Sendblue numbers posts a WebhookConfiguration object", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", webhooks: {} } }]);
  await webhookCreate.execute({
    url: "https://example.com/hook",
    sendblueNumbers: ["+1", "+2"],
  }, ctx);

  assertEquals(jsonBodyOf(calls[0]), {
    webhooks: [{ url: "https://example.com/hook", sendblue_numbers: ["+1", "+2"] }],
  });
});
