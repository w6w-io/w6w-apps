import { assertEquals } from "@std/assert";
import webhookUpsert from "../../actions/webhook-upsert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-upsert: PUTs to the form/tag path with event_types and headers", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://example.com/hook" } }]);
  await webhookUpsert.execute(
    {
      formId: "f1",
      webhookTag: "hubspot-webhook",
      url: "https://example.com/hook",
      eventTypes: ["form_response", "form_response_transcribed"],
      headers: { secret: "open-sesame" },
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/forms/f1/webhooks/hubspot-webhook");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com/hook",
    event_types: ["form_response", "form_response_transcribed"],
    headers: { secret: "open-sesame" },
  });
});

Deno.test("webhook-upsert: headers is optional and omitted, not sent as null/undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await webhookUpsert.execute(
    { formId: "f1", webhookTag: "t1", url: "https://example.com", eventTypes: ["form_response"] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("headers" in body, false);
});
