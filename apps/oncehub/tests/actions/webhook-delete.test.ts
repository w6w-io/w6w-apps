import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: DELETEs /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "WHK-1", deleted: true } }]);
  const result = await action.execute({ id: "WHK-1" }, ctx) as { deleted?: boolean };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/webhooks/WHK-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result.deleted, true);
});
