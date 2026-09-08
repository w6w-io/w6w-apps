import { assert, assertEquals } from "@std/assert";
import privateKey, { authHeaders, PROBE_PATH } from "../../auth/private-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "vapi-private-key-unitTestFixtureNotReal-00000";

Deno.test("private-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.vapi.ai/assistant",
    headers: {} as Record<string, string>,
  };
  const signed = privateKey.sign!({ request, credential: { privateKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://api.vapi.ai/assistant");
  assert(!signed.url.includes(KEY));
});

Deno.test("private-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ privateKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("private-key: the probe is /assistant", () => {
  assertEquals(PROBE_PATH, "/assistant");
});

Deno.test("private-key: test passes when the assistant list answers", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const result = await privateKey.test({ credential: { privateKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/assistant");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("private-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await privateKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The vendor's own 401 body names the public/private key mix-up directly —
 * this is the one message this app must surface verbatim rather than flatten
 * to a bare "401 Unauthorized".
 */
Deno.test("private-key: a public-key mistake is reported with the vendor's own hint", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        "Invalid Key. Hot tip, you may be using the private key instead of the public key, or vice versa.",
        "Unauthorized",
        401,
      ),
    },
  ]);
  const result = await privateKey.test({
    credential: { privateKey: "pk_public_key_pasted_by_mistake" },
  }, ctx);

  assertEquals(result.ok, false);
  assert(/private key instead of the public key/i.test(result.message ?? ""), result.message);
});

Deno.test("private-key: a missing-header 401 is still reported", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("Missing Authorization Header.", "Unauthorized", 401) },
  ]);
  const result = await privateKey.test({ credential: { privateKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/Missing Authorization Header/.test(result.message ?? ""), result.message);
});

Deno.test("private-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await privateKey.test({ credential: { privateKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});
