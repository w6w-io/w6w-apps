import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs a webhook by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { project_id: "p1", webhook_deleted: true } }]);
  const out = await webhookDelete.execute({ projectId: "p1", webhookId: "w1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/webhooks/w1");
  assertEquals(out, { project_id: "p1", webhook_deleted: true });
});

Deno.test("webhook-delete: is idempotent", () => {
  assertEquals(webhookDelete.idempotent, true);
});
