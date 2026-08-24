import { assert, assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs name/url/secret/subscriptions to /api/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_1", name: "CRM sync" } }]);
  await webhookCreate.execute(
    {
      name: "CRM sync",
      url: "https://example.com/hook",
      secret: "shh",
      subscriptions: [{ event: "CONTACT_CREATED", schemaVersion: 2 }],
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/webhooks");
  assertEquals(
    JSON.parse(calls[0].body!),
    {
      name: "CRM sync",
      url: "https://example.com/hook",
      secret: "shh",
      subscriptions: [{ event: "CONTACT_CREATED", schemaVersion: 2 }],
    },
  );
});

Deno.test("webhook-create: never logs or otherwise surfaces the signing secret to the caller", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { id: "wh_1", name: "CRM sync" } }]);
  const out = await webhookCreate.execute(
    {
      name: "CRM sync",
      url: "https://example.com/hook",
      secret: "shh-do-not-echo",
      subscriptions: [{ event: "CONTACT_CREATED" }],
    },
    ctx,
  );
  assert(!JSON.stringify(out).includes("shh-do-not-echo"));
});
