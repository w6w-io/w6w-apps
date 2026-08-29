import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-list.ts";

Deno.test("webhook-list: fetches every webhook with no params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "wh_1", isEnabled: true }] }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/webhooks");
  assertEquals((result as { webhooks: unknown[] }).webhooks.length, 1);
});
