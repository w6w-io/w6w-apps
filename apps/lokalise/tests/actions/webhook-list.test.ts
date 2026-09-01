import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: lists webhooks including their signing secret", async () => {
  const { ctx, calls } = mockCtx([
    { body: { webhooks: [{ webhook_id: "w1", secret: "shh" }] } },
  ]);
  const out = await webhookList.execute({ projectId: "p1", limit: 50 }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/webhooks");
  assertEquals(out.items, [{ webhook_id: "w1", secret: "shh" }]);
});
