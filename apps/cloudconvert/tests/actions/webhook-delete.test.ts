import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs /v2/webhooks/{id} and reports deleted on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ webhookId: "4354367" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/webhooks/4354367");
  assertEquals(out, { deleted: true });
});

Deno.test("webhook-delete: is declared idempotent", () => {
  assertEquals(webhookDelete.idempotent, true);
});
