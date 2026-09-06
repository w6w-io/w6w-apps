import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-webhook.ts";

Deno.test("delete-webhook: DELETEs /webhooks/{id} and reports { deleted: true }", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ webhookId: "1234567" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/webhooks/1234567");
  assertEquals(out, { deleted: true });
});
