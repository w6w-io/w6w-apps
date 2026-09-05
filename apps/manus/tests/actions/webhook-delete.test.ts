import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: posts webhook_id to /v2/webhook.delete", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({}) }]);
  await webhookDelete.execute({ webhookId: "w1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhook.delete");
  assertEquals(JSON.parse(calls[0].body!), { webhook_id: "w1" });
});

Deno.test("webhook-delete: is idempotent", () => {
  assertEquals(webhookDelete.idempotent, true);
});
