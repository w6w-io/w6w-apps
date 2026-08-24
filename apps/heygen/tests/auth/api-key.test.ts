import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const KEY = "heygen_unit_test_fixture_not_a_real_key";

Deno.test("api-key: sign stamps the X-Api-Key header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.heygen.com/v3/videos",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["x-api-key"], KEY);
  assertEquals(signed.url, "https://api.heygen.com/v3/videos");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { "x-api-key": KEY });
});

Deno.test("api-key: the probe is the vendor's own documented verification endpoint", () => {
  assertEquals(PROBE_PATH, "/v3/users/me");
});

Deno.test("api-key: test passes when the whoami answers", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ username: "acme", email: "a@b.com" }) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v3/users/me");
  assertEquals(calls[0].headers["x-api-key"], KEY);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * A missing key and an invalid one answer byte-identically on the wire (measured live
 * 2026-08-24) — `test` reports both as the same failure mode rather than pretending to tell them
 * apart.
 */
Deno.test("api-key: an unauthorized response is reported as a rejected key", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("unauthorized", "Unauthorized") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
  assert(/identically/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: phone_verification_required is reported as a distinct, actionable failure", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("phone_verification_required", "Complete SMS verification") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/phone verification/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect publishes only the username and email", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ username: "acme", email: "ops@acme.example", first_name: "A" }) },
  ]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/users/me");
  assertEquals(display, { username: "acme", email: "ops@acme.example" });
});

Deno.test("api-key: afterConnect stays silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("unauthorized", "Unauthorized") }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: afterConnect stays silent when the response carries no username", async () => {
  const { ctx } = mockCtx([{ body: envelope({ email: "a@b.com" }) }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(apiKey.apiKey?.in, "header");
  assertEquals(apiKey.apiKey?.name, "X-Api-Key");
});
