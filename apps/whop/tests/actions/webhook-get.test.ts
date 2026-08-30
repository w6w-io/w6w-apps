import { assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GETs /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "hook_1", url: "https://example.com/hooks" } }]);
  const out = await webhookGet.execute({ webhookId: "hook_1" }, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/webhooks/hook_1");
  assertEquals(out.id, "hook_1");
});
