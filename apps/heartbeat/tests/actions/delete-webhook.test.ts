import { assertEquals } from "@std/assert";
import deleteWebhook from "../../actions/delete-webhook.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-webhook: DELETE /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await deleteWebhook.execute({ webhookID: "w1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v0/webhooks/w1");
});

Deno.test("delete-webhook: is idempotent", () => {
  assertEquals(deleteWebhook.idempotent, true);
});
