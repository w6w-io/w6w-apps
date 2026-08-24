import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs /robots/{robotId}/webhooks/{webhookId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: errorBody(200, "success") }]);
  const out = await webhookDelete.execute({ robotId: "r1", webhookId: "w1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/webhooks/w1");
  assertEquals(out, { deleted: true });
});

Deno.test("webhook-delete: is declared idempotent", () => {
  assertEquals(webhookDelete.idempotent, true);
});
