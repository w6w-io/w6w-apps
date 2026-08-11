import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs /v1/webhooks/{id}", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ webhookId: "uuid-1" }, ctx) as { status: number };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/uuid-1");
  assertEquals(out.status, 204);
  assertEquals(logs[0].level, "warn");
});
