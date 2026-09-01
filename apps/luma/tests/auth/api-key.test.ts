import { assert, assertEquals } from "@std/assert";
import apiKey, { API_KEY_HEADER, authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "luma-api-unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps the x-luma-api-key header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://public-api.luma.com/v1/events/get",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers[API_KEY_HEADER], KEY);
  // No Bearer prefix — the OpenAPI security scheme carries the raw key.
  assertEquals(Object.keys(signed.headers), [API_KEY_HEADER]);
  assertEquals(signed.url, "https://public-api.luma.com/v1/events/get");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { [API_KEY_HEADER]: KEY });
});

/**
 * Pinned so nobody swaps this for `/v1/users/get-self`'s more "obvious"
 * whoami-shaped sibling without noticing this already IS that endpoint, or
 * for something resource-scoped that a narrower key configuration could fail.
 */
Deno.test("api-key: the probe is GET /v1/users/get-self", () => {
  assertEquals(PROBE_PATH, "/v1/users/get-self");
});

Deno.test("api-key: test passes when the probe answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "usr-1", email: "a@b.com" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/users/get-self");
  assertEquals(calls[0].headers[API_KEY_HEADER], KEY);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/** Live-observed 2026-09-01: missing header -> 400, bad key -> 401. Both classified from the body. */
Deno.test("api-key: test classifies the missing-key 400 from the response body", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { message: "Please provide an API key.", code: null } },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(result.message, "Please provide an API key.");
});

Deno.test("api-key: test classifies the bad-key 401 with actionable guidance", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { message: "You are not signed in.", code: null } },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "wrong" } }, ctx);

  assertEquals(result.ok, false);
  assert(result.message?.includes("You are not signed in."));
  assert(result.message?.includes("luma.com/calendar/manage/api-keys"));
});

Deno.test("api-key: test never echoes the credential back in its message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { message: "You are not signed in.", code: null } },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assert(!result.message?.includes(KEY));
});

Deno.test("api-key: afterConnect publishes email/name, nothing else", async () => {
  const { ctx } = mockCtx([
    { body: { id: "usr-1", name: "Ada Lovelace", email: "ada@example.com", avatar_url: "x" } },
  ]);
  const result = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { email: "ada@example.com", name: "Ada Lovelace", userId: "usr-1" });
});

Deno.test("api-key: afterConnect fails silently on a bad response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "nope", code: null } }]);
  const result = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result, {});
});

Deno.test("api-key: the credential field is declared secret", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
