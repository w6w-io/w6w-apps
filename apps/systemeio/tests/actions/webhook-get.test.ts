import { assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: fetches /api/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh_1", name: "CRM sync" } }]);
  const out = await webhookGet.execute({ id: "wh_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/webhooks/wh_1");
  assertEquals(out, { id: "wh_1", name: "CRM sync" });
});
