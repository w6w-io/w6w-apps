import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { API_KEY, errorBody, MAX_US_BASE, mockCtx, RETAIL_BASE } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest): SignableRequest {
  const { ctx } = mockCtx([]);
  return apiKey.sign!(
    { request, credential: { platform: "retail", apiKey: API_KEY } } as never,
    ctx,
  ) as SignableRequest;
}

Deno.test("auth: declares the platform and the key as fields", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  const fields = apiKey.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["platform", "apiKey"]);
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  // The platform is a choice, not a secret — and defaulting it to retail is what
  // makes the common case one field.
  assertEquals(fields.find((f) => f.key === "platform")?.default, "retail");
});

/**
 * The prefix is literal and required. Omitting it produces code 1014, which
 * reads like a rejected key rather than a malformed header.
 */
Deno.test("authHeaders: prefixes the key with `api-key `, per the security scheme", () => {
  assertEquals(authHeaders({ apiKey: API_KEY }), { "x-auth-token": `api-key ${API_KEY}` });
  assertEquals(apiKey.apiKey?.name, "X-Auth-Token");
  assertEquals(apiKey.apiKey?.prefix, "api-key ");
});

Deno.test("sign: stamps the prefixed header and leaves the URL alone", () => {
  const request = { url: `${RETAIL_BASE}/contacts`, headers: {} as Record<string, string> };
  const signed = signWith(request);
  assertEquals(signed.headers["x-auth-token"], `api-key ${API_KEY}`);
  assertEquals(signed.url, `${RETAIL_BASE}/contacts`);
});

/**
 * The probe is pinned by path. `/accounts` returns the account that owns the key
 * and carries no key material — unlike the `/me`-shaped endpoints that
 * disqualify themselves elsewhere in this pack.
 */
Deno.test("test: probes /accounts on the host the platform selects", async () => {
  const { ctx, calls } = mockCtx([{ body: { accountId: "acc1", email: "ada@example.com" } }]);
  const result = await apiKey.test!(
    { credential: { platform: "retail", apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(PROBE_PATH, "/accounts");
  assertEquals(calls[0].url, `${RETAIL_BASE}${PROBE_PATH}`);
  assertEquals(calls[0].headers["x-auth-token"], `api-key ${API_KEY}`);
});

/** The load-bearing case: a MAX key must be probed against the MAX host. */
Deno.test("test: a MAX platform probes the MAX host, not the retail one", async () => {
  const { ctx, calls } = mockCtx([{ body: { accountId: "acc2" } }]);
  await apiKey.test!({ credential: { platform: "max-us", apiKey: API_KEY } } as never, ctx);
  assertEquals(calls[0].url, `${MAX_US_BASE}${PROBE_PATH}`);
});

Deno.test("test: reports a missing key without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { platform: "retail" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The most likely real-world failure is a key/platform mismatch, so the message
 * names it rather than saying only "rejected".
 */
Deno.test("test: a 1014 blames the key AND the platform pairing", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(1014, "Unsupported authentication method") },
  ]);
  const result = await apiKey.test!(
    { credential: { platform: "retail", apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("code 1014"), result.message);
  assert(result.message!.includes("MAX key does not work against the retail host"), result.message);
});

/** Throttling at connect time is not a bad credential, and must not read as one. */
Deno.test("test: a 1015 is reported as throttling, not as a rejected key", async () => {
  const { ctx } = mockCtx([
    { status: 429, body: errorBody(1015, "You have reached your requests limit") },
  ]);
  const result = await apiKey.test!(
    { credential: { platform: "retail", apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("throttling"), result.message);
  assert(!result.message!.includes("Check the key"), result.message);
});

Deno.test("test: a 200 that is not an account record is rejected", async () => {
  const { ctx } = mockCtx([{ body: { message: "hello" } }]);
  const result = await apiKey.test!(
    { credential: { platform: "retail", apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("did not return a GetResponse account"), result.message);
});

Deno.test("afterConnect: records the platform and the owning account", async () => {
  const { ctx } = mockCtx([{
    body: { accountId: "acc1", email: "ada@example.com", companyName: "Example Ltd" },
  }]);
  const display = await apiKey.afterConnect!(
    { credential: { platform: "max-pl", apiKey: API_KEY } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.platform, "max-pl");
  assertEquals(display.account, { id: "acc1", email: "ada@example.com", company: "Example Ltd" });
});

Deno.test("afterConnect: never republishes the key", async () => {
  const { ctx } = mockCtx([{ body: { accountId: "acc1", email: "ada@example.com" } }]);
  const display = await apiKey.afterConnect!(
    { credential: { platform: "retail", apiKey: API_KEY } } as never,
    ctx,
  );
  assert(!JSON.stringify(display).includes(API_KEY));
});

/** Even when the lookup fails, the platform must be recorded — the client needs it. */
Deno.test("afterConnect: a failed lookup still records the platform", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(1014, "nope") }]);
  const display = await apiKey.afterConnect!(
    { credential: { platform: "max-us", apiKey: API_KEY } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.platform, "max-us");
  assertEquals(display.account, undefined);
});
