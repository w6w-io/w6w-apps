import { assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: fetches /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ id: "wh_1", url: "https://example.com/hook" }),
  }]);
  const out = await webhookGet.execute({ id: "wh_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/webhooks/wh_1");
  assertEquals(out, { id: "wh_1", url: "https://example.com/hook" });
});
