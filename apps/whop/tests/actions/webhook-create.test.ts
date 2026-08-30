import { assert, assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs url and events, serializing multiselect to an array", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "hook_1", webhook_secret: "whsec_test" } },
  ]);
  const out = await webhookCreate.execute(
    { url: "https://example.com/hooks", events: ["payment.succeeded", "payment.failed"] },
    ctx,
  ) as { id: string; webhook_secret: string };

  assertEquals(pathOf(calls[0].url), "/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com/hooks",
    events: ["payment.succeeded", "payment.failed"],
  });
  // The secret is returned, not stripped — this action is the one legitimate
  // place a caller needs it, unlike an incidentally-leaked credential.
  assertEquals(out.webhook_secret, "whsec_test");
});

Deno.test("webhook-create: events accepts the comma-string form a user types", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "hook_1" } }]);
  await webhookCreate.execute(
    { url: "https://x", events: "payment.succeeded,payment.failed" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).events, ["payment.succeeded", "payment.failed"]);
});

Deno.test("webhook-create: sends the runtime's invocationId as Idempotency-Key", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: { id: "hook_1" } }], "inv-webhook");
  await webhookCreate.execute({ url: "https://x", events: ["payment.succeeded"] }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-webhook");
});

Deno.test("webhook-create: describes the secret as sensitive in its own description", () => {
  assert(/sensitive/i.test(webhookCreate.description ?? ""));
});
