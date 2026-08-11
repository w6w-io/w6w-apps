import { assert, assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: strips the token from the single-entity read too", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: entityBody("webhook", {
        webhook_id: "c2501111-8a69-4342-bb34-bcd6cfe564ab",
        url: "https://a.example.com",
        active: true,
        events: ["call.created"],
        token: "abc123def456ghi789",
      }),
    },
  ]);
  const out = await webhookGet.execute({ webhookId: "c2501111-8a69-4342-bb34-bcd6cfe564ab" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/webhooks/c2501111-8a69-4342-bb34-bcd6cfe564ab");
  assert(
    !JSON.stringify(out).includes("abc123def456ghi789"),
    "the webhook token survived into the result",
  );
  assertEquals((out as Record<string, unknown>).active, true);
  assertEquals((out as Record<string, unknown>).events, ["call.created"]);
});
