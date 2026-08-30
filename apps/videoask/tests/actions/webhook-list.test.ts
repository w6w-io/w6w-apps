import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: GETs /forms/{formId}/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ tag: "hubspot-webhook" }] }]);
  const out = await webhookList.execute({ formId: "f1" }, ctx) as { result: unknown };
  assertEquals(pathOf(calls[0].url), "/forms/f1/webhooks");
  assertEquals(out.result, [{ tag: "hubspot-webhook" }]);
});
