import { assertEquals } from "@std/assert";
import webhooksCreate from "../../actions/webhooks-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * This is the exact response shape Dialpad's own OpenAPI example shows for
 * this endpoint: `{"hook_url": "https://test.com/webhooks", "id": "193",
 * "signature": {"algo": "HS256", "secret": "test_secret", "type": "jwt"}}`.
 */
Deno.test("webhooks-create: POSTs /webhooks and strips the vendor's own example secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      hook_url: "https://test.com/webhooks",
      id: "193",
      signature: { algo: "HS256", secret: "test_secret", type: "jwt" },
    },
  }]);
  const out = await webhooksCreate.execute({ hookUrl: "https://test.com/webhooks" }, ctx) as {
    id: string;
    signature: { secret?: string; algo?: string };
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks");
  assertEquals(JSON.parse(calls[0].body!).hook_url, "https://test.com/webhooks");
  assertEquals(out.id, "193");
  assertEquals(out.signature.secret, undefined);
  assertEquals(out.signature.algo, "HS256");
});

Deno.test("webhooks-create: declared non-idempotent", () => {
  assertEquals(webhooksCreate.idempotent, false);
});
