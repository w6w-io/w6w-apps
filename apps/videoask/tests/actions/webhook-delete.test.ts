import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs /forms/{formId}/webhooks/{webhookTag}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ formId: "f1", webhookTag: "hubspot-webhook" }, ctx) as {
    status: number;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/forms/f1/webhooks/hubspot-webhook");
  assertEquals(out.status, 204);
});
