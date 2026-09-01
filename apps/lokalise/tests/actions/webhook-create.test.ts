import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: sends url and events, joining the multiselect into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { webhook_id: "w1", secret: "shh" } }]);
  await webhookCreate.execute(
    {
      projectId: "p1",
      url: "https://my.domain.com/webhook",
      events: ["project.translation.proofread", "project.translation.updated"],
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://my.domain.com/webhook",
    events: ["project.translation.proofread", "project.translation.updated"],
  });
});

Deno.test("webhook-create: forwards branch and event_lang_map", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await webhookCreate.execute(
    {
      projectId: "p1",
      url: "https://x/y",
      events: ["project.translation.updated"],
      branch: "main",
      eventLangMap: '[{"event":"project.translation.updated","lang_iso_codes":["en_GB"]}]',
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.branch, "main");
  assertEquals(body.event_lang_map, [
    { event: "project.translation.updated", lang_iso_codes: ["en_GB"] },
  ]);
});

/**
 * Unlike Apify's Create Webhook, Lokalise documents no idempotency key here —
 * a retry duplicates the subscription.
 */
Deno.test("webhook-create: is not idempotent", () => {
  assertEquals(webhookCreate.idempotent, false);
});
