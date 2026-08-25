import { assertEquals } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: PUTs the full parsed replacement map to /api/account/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", webhooks: {} } }]);
  await webhookUpdate.execute({ webhooks: '{"receive":["https://example.com"]}' }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/account/webhooks");
  assertEquals(jsonBodyOf(calls[0]), { webhooks: { receive: ["https://example.com"] } });
});
