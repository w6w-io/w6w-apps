import { assertEquals } from "@std/assert";
import webhookDeleteUrl from "../../actions/webhook-delete-url.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete-url: DELETEs /v2.1/webhooks/url/{url_id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ type: "call.completed", url_count: 0, webhook_urls: [] }) },
  ]);
  await webhookDeleteUrl.execute({ url_id: "65b17425xxxxx" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2.1/webhooks/url/65b17425xxxxx");
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("webhook-delete-url: is idempotent — the end state is the same either way", () => {
  assertEquals(webhookDeleteUrl.idempotent, true);
});
