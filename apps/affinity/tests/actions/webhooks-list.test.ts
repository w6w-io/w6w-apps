import { assertEquals } from "@std/assert";
import webhooksList from "../../actions/webhooks-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhooks-list: calls GET /webhook", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1234, webhook_url: "https://x.example.com" }] }]);
  await webhooksList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/webhook");
});
