import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: hits GET /v2.1/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [], total_count: 0 } }]);
  await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2.1/webhooks");
});

Deno.test("webhook-list: an event type filters the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await webhookList.execute({ type: "call.completed" }, ctx);
  assertEquals(queryOf(calls[0].url).type, "call.completed");
});
