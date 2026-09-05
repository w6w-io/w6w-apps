import { assertEquals } from "@std/assert";
import webhooksUpdate from "../../actions/webhooks-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhooks-update: PUTs to /webhook/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1234, disabled: true } }]);
  await webhooksUpdate.execute({ webhookSubscriptionId: 1234, disabled: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/webhook/1234");
  assertEquals(JSON.parse(calls[0].body!), { disabled: true });
});
