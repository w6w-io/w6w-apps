import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs /webhooks/ with event_type and callback_url", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "wh-1" } }]);
  await webhookCreate.execute({
    eventType: "signed",
    callbackUrl: "https://example.com/hook",
    name: "Signed notifications",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v1/webhooks/");
  assertEquals(bodyOf(calls[0]), {
    event_type: "signed",
    callback_url: "https://example.com/hook",
    name: "Signed notifications",
  });
});
