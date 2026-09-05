import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf, singleErrorBody } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs /webhooks/{id} and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ webhookId: "19451" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/webhooks/19451");
  assertEquals(out, { status: 204 });
});

Deno.test("webhook-delete: a repeat delete on a gone id surfaces as an error, not a silent success", async () => {
  const { ctx } = mockCtx([{ status: 404, body: singleErrorBody("webhook not found") }]);
  await assertRejects(
    async () => await webhookDelete.execute({ webhookId: "19451" }, ctx),
    Error,
    "webhook not found",
  );
});
