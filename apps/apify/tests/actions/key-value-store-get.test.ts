import { assert, assertEquals } from "@std/assert";
import keyValueStoreGet from "../../actions/key-value-store-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("key-value-store-get: calls GET /v2/key-value-stores/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "s1", name: "config", generalAccess: "RESTRICTED" }) },
  ]);
  const out = await keyValueStoreGet.execute({ storeId: "s1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v2/key-value-stores/s1");
  assertEquals(out.name, "config");
});

/**
 * `KeyValueStore.urlSigningSecretKey` mints signed public URLs for this store's
 * records — a live credential in an ordinary metadata read.
 */
Deno.test("key-value-store-get: the URL-signing secret never reaches the caller", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope({
        id: "s1",
        name: "config",
        recordsPublicUrl: "https://api.apify.com/v2/key-value-stores/s1/records",
        urlSigningSecretKey: "hmac-key-do-not-leak",
      }),
    },
  ]);
  const out = await keyValueStoreGet.execute({ storeId: "s1" }, ctx) as Record<string, unknown>;

  assertEquals("urlSigningSecretKey" in out, false);
  assert(!JSON.stringify(out).includes("hmac-key-do-not-leak"));
  // The public URLs are not secrets and are kept.
  assertEquals(
    out.recordsPublicUrl,
    "https://api.apify.com/v2/key-value-stores/s1/records",
  );
});
