import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: posts url, returns the webhook unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({
      webhook: { id: "w1", url: "https://example.com/hook", status: "active", created_at: 1 },
    }),
  }]);
  const out = await webhookCreate.execute({ url: "https://example.com/hook" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhook.create");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://example.com/hook" });
  assertEquals(out.status, "active");
});

Deno.test("webhook-create: is not idempotent — no uniqueness constraint on the URL", () => {
  assertEquals(webhookCreate.idempotent, false);
});
