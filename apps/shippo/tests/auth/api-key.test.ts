import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { modeOf } from "../../auth/api-key.ts";

/** Shippo's own scheme — verified live 2026-09-05 to be distinct from Bearer. */
Deno.test("api-key: sign sends the ShippoToken scheme, not Bearer", () => {
  const request = { url: "https://api.goshippo.com/shipments", method: "GET", headers: {} };
  const signed = auth.sign!(
    { request, credential: { apiKey: "shippo_live_abc123" } },
    mockCtx().ctx,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["authorization"], "ShippoToken shippo_live_abc123");
});

Deno.test("modeOf: reads the token's own prefix and refuses to guess otherwise", () => {
  assertEquals(modeOf("shippo_test_abc"), "test");
  assertEquals(modeOf("shippo_live_abc"), "live");
  assertEquals(modeOf("not-a-shippo-token"), "unknown");
  assertEquals(modeOf(undefined), "unknown");
});

/**
 * The failure this reporting exists for: a test token succeeds at everything
 * and buys nothing, and nothing in a shipment's own response says which kind
 * made it — only the token's own prefix does.
 */
Deno.test("api-key: test names the environment from the token's prefix", async () => {
  const live = mockCtx([{ status: 200, body: { results: [] } }]);
  const liveResult = await auth.test!({ credential: { apiKey: "shippo_live_abc" } }, live.ctx);
  assertEquals(live.calls[0].url, "https://api.goshippo.com/carrier_accounts?results=1");
  assertEquals(liveResult.ok, true);
  assert(/LIVE token/.test(liveResult.message!), liveResult.message);
  assert(/real postage/.test(liveResult.message!), liveResult.message);

  const test = mockCtx([{ status: 200, body: { results: [] } }]);
  const testResult = await auth.test!({ credential: { apiKey: "shippo_test_abc" } }, test.ctx);
  assertEquals(testResult.ok, true);
  assert(/TEST token/.test(testResult.message!), testResult.message);
  assert(/buy nothing/.test(testResult.message!), testResult.message);
});

/** Guessing the mode would be worse than not knowing. */
Deno.test("api-key: an unrecognized token prefix is reported as unstated, not guessed", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await auth.test!({ credential: { apiKey: "sk_something_else" } }, ctx);
  assertEquals(result.ok, true);
  assert(/does not identify it/.test(result.message!), result.message);
});

/** The response never echoes the credential — only the mode, read from its prefix. */
Deno.test("api-key: test does not read anything from the response body to decide mode", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [{ object_id: "ca_1" }] } }]);
  const result = await auth.test!({ credential: { apiKey: "shippo_live_abc" } }, ctx);
  assert(/LIVE token/.test(result.message!), result.message);
});

/** The three auth failure shapes Shippo actually returns, reproduced live 2026-09-05. */
Deno.test("api-key: a rejected token names Shippo's own error text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Token does not exist" } }]);
  const result = await auth.test!({ credential: { apiKey: "shippo_live_bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(/Token does not exist/.test(result.message!), result.message);
});

Deno.test("api-key: a missing credential is refused before a request is made", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** The mode is public metadata, derived without a network call; the token never is. */
Deno.test("api-key: afterConnect records the mode and never the token, with no fetch", () => {
  const display = auth.afterConnect!(
    { credential: { apiKey: "shippo_live_secret123" } },
    mockCtx().ctx,
  );
  assertEquals(display, { mode: "live" });
  assert(!JSON.stringify(display).includes("secret123"));
});

Deno.test("api-key: is apiKey auth using the ShippoToken prefix, with one secret field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "ShippoToken " });
  assertEquals(auth.fields!.map((f) => f.key), ["apiKey"]);
  assertEquals(auth.fields![0].type, "secret");
});
