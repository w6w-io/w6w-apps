import { assertEquals } from "@std/assert";
import webhooksUpdate from "../../actions/webhooks-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhooks-update: PATCHes /webhooks/{id} and strips the signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "1", hook_url: "https://new", signature: { algo: "HS256", secret: "new-secret" } },
  }]);
  const out = await webhooksUpdate.execute(
    { webhookId: "1", hookUrl: "https://new" },
    ctx,
  ) as { signature: { secret?: string } };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks/1");
  assertEquals(JSON.parse(calls[0].body!).hook_url, "https://new");
  assertEquals(out.signature.secret, undefined);
});

Deno.test("webhooks-update: declared idempotent", () => {
  assertEquals(webhooksUpdate.idempotent, true);
});
