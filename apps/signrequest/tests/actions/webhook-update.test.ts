import { assertEquals } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: PATCHes /webhooks/{id}/ with only the given fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { uuid: "wh-1", callback_url: "https://new.example.com" },
  }]);
  await webhookUpdate.execute({ webhookId: "wh-1", callbackUrl: "https://new.example.com" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0]), "/api/v1/webhooks/wh-1/");
  assertEquals(bodyOf(calls[0]), { callback_url: "https://new.example.com" });
});
