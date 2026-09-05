import { assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: hits /webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "wh_1" }]) }]);
  await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
});
