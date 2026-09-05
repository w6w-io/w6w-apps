import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: hits GET /webhooks with no params", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope("webhooks", [{ id: 1, topic: "subscription/created" }]) },
  ]);
  const out = await webhookList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/webhooks");
  assertEquals(out.items, [{ id: 1, topic: "subscription/created" }]);
});

Deno.test("webhook-list: takes no parameters", () => {
  assertEquals(webhookList.params?.length, 0);
});
