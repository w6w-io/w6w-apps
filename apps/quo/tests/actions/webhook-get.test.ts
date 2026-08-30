import { assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GETs /v1/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "WH1" } } }]);
  await webhookGet.execute({ id: "WH1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/WH1");
});

Deno.test("webhook-get: is a read action", () => {
  assertEquals(webhookGet.type, "read");
});
