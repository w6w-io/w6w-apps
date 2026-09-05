import { assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GETs /v2/account/webhooks/{id} with no data envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "w1", url: "https://webhook.site/x", topic: "campaigns/new", status: "ACTIVE" },
  }]);
  const out = await webhookGet.execute({ id: "w1" }, ctx) as { topic: string };

  assertEquals(pathOf(calls[0].url), "/v2/account/webhooks/w1");
  assertEquals(out.topic, "campaigns/new");
});
