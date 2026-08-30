import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: fetches with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("webhooks", []) }]);
  await webhookList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(webhookList.params, []);
});
