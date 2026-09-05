import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { API_VERSION } from "../../lib/client.ts";
import { mockCtx, pathOf, problemBody } from "../_helpers.ts";

const KEY = "unit-test-fixture-not-a-real-key-00000000";

Deno.test("api-key: sign stamps the non-standard scheme and the version header", () => {
  const request = {
    method: "GET",
    url: "https://api.omnisend.com/api/contacts",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Omnisend-API-Key ${KEY}`);
  assertEquals(signed.headers["omnisend-version"], API_VERSION);
  // Not Bearer — Omnisend's own scheme, verified against the vendor's docs.
  assert(!signed.headers.authorization.startsWith("Bearer"));
});

Deno.test("api-key: test passes and reads brandID from the body, not just the status", async () => {
  const { ctx, calls } = mockCtx([{ body: { brandID: "b1", name: "Acme" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/brands/current");
  assertEquals(calls[0].headers.authorization, `Omnisend-API-Key ${KEY}`);
  assertEquals(calls[0].headers["omnisend-version"], API_VERSION);
});

/**
 * A 200 with no brandID must not pass — the classification reads the body,
 * not just `res.ok`. Guards against a future decoy 200 (e.g. an SPA shell)
 * being mistaken for a live credential.
 */
Deno.test("api-key: a 200 with no brandID in the body does not pass", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: "shape" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: an unauthorized response is reported with the vendor's own title", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: problemBody("unauthorized", "Unauthorized", 401),
  }]);
  const result = await apiKey.test({ credential: { apiKey: "bad-key" } }, ctx);

  assertEquals(result.ok, false);
  assert(/Unauthorized/.test(result.message ?? ""), result.message);
  assert(/401/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a failure with an unreadable body still reports the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect publishes brand display fields from the same endpoint", async () => {
  const { ctx, calls } = mockCtx([
    { body: { brandID: "b1", name: "Acme", platform: "shopify", website: "https://acme.test" } },
  ]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/brands/current");
  assertEquals(display, {
    brand: { id: "b1", name: "Acme", platform: "shopify", website: "https://acme.test" },
  });
});

Deno.test("api-key: afterConnect falls back to the brandID when name is absent", async () => {
  const { ctx } = mockCtx([{ body: { brandID: "b1" } }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx) as {
    brand: { name: string };
  };
  assertEquals(display.brand.name, "b1");
});

Deno.test("api-key: afterConnect stays silent when the request fails", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: problemBody("unauthorized", "Unauthorized", 401),
  }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: the credential field is declared secret", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "custom");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
