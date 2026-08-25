import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: GETs the un-versioned /api/account/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", webhooks: {} } }]);
  await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/account/webhooks");
});
