import { assert, assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { bodyOf, entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs /v1/webhooks with url, name and events", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: entityBody("webhook", { webhook_id: "uuid-1", token: "df76g76d" }) },
  ]);
  await webhookCreate.execute({
    url: "https://example.com/hook",
    customName: "My Custom Workflow",
    events: ["contact.created", "contact.updated"],
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(bodyOf(calls[0]), {
    url: "https://example.com/hook",
    custom_name: "My Custom Workflow",
    events: ["contact.created", "contact.updated"],
  });
});

/**
 * The deliberate exception to the stripping rule: this call ISSUES the secret,
 * it belongs to the webhook this step just created, and it can never be re-read.
 */
Deno.test("webhook-create: returns the token, unlike every other webhook action", async () => {
  const { ctx } = mockCtx([
    {
      status: 201,
      body: entityBody("webhook", { webhook_id: "uuid-1", token: "df76g76dpziygs567f0" }),
    },
  ]);
  const out = await webhookCreate.execute({ url: "https://example.com/hook" }, ctx);
  assertEquals((out as Record<string, unknown>).token, "df76g76dpziygs567f0");
});

/**
 * "If events field is empty, all events will be attached to this webhook" —
 * around ninety event types, and it is the DEFAULT. A silent firehose deserves
 * a warning in the run log.
 */
Deno.test("webhook-create: an empty event list omits the field and warns", async () => {
  const { ctx, calls, logs } = mockCtx([
    { status: 201, body: entityBody("webhook", { webhook_id: "uuid-1" }) },
  ]);
  await webhookCreate.execute({ url: "https://example.com/hook" }, ctx);

  assert(!("events" in bodyOf(calls[0])), JSON.stringify(bodyOf(calls[0])));
  assertEquals(logs[0].level, "warn");
  assert(logs[0].message.includes("every event type"), logs[0].message);
});
