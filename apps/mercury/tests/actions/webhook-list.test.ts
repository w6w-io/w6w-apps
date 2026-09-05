import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf, queryAllOf } from "../_helpers.ts";

Deno.test("webhook-list: GETs /webhooks, reads the webhooks response key", async () => {
  const { ctx, calls } = mockCtx([{ body: { webhooks: [{ id: "wh_1" }], page: {} } }]);
  const out = await webhookList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/webhooks");
  assertEquals((out.items as unknown[]).length, 1);
});

Deno.test("webhook-list: repeats status as a multi-value query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { webhooks: [], page: {} } }]);
  await webhookList.execute({ status: ["active", "paused"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "status"), ["active", "paused"]);
});
