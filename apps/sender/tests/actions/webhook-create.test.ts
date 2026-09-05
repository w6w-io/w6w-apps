import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs to /v2/account/webhooks", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        id: "w1",
        url: "https://webhook.site/x",
        topic: "groups/new-subscriber",
        group: "g1",
        status: "ACTIVE",
      },
    },
  ]);
  const out = await webhookCreate.execute(
    { url: "https://webhook.site/x", topic: "groups/new-subscriber", relationId: "g1" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/account/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://webhook.site/x",
    topic: "groups/new-subscriber",
    relation_id: "g1",
  });
  assertEquals(out.id, "w1");
});
