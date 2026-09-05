import { assertEquals } from "@std/assert";
import webhooksGet from "../../actions/webhooks-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhooks-get: calls GET /webhook/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1234, webhook_url: "https://x.example.com" } }]);
  await webhooksGet.execute({ webhookSubscriptionId: 1234 }, ctx);
  assertEquals(pathOf(calls[0].url), "/webhook/1234");
});
