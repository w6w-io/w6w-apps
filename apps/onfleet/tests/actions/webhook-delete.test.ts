import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: sends DELETE and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ webhookId: "wh_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/webhooks/wh_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});

Deno.test("webhook-delete: webhookId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "webhookId");
  assertEquals(calls.length, 0);
});
