import { assertEquals } from "@std/assert";
import webhooksDelete from "../../actions/webhooks-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhooks-delete: DELETEs /webhooks/{id} and strips the signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "1", signature: { algo: "HS256", secret: "s" } },
  }]);
  const out = await webhooksDelete.execute({ webhookId: "1" }, ctx) as {
    signature: { secret?: string };
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks/1");
  assertEquals(out.signature.secret, undefined);
});

Deno.test("webhooks-delete: declared idempotent", () => {
  assertEquals(webhooksDelete.idempotent, true);
});
