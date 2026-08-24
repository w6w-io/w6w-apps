import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs /api/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ id: "wh_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/webhooks/wh_1");
  assertEquals(out, { status: 204 });
});
