import { assert, assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: strips the signing token", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "42", url: "https://a/hook", scopes: ["*"], token: "s3cret", enabled: true },
  }]);
  const webhook = await webhookGet.execute({ webhookId: "42" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhooks/42");
  assert(!JSON.stringify(webhook).includes("s3cret"), "the signing token survived");
  assertEquals(webhook, { id: "42", url: "https://a/hook", scopes: ["*"], enabled: true });
});
