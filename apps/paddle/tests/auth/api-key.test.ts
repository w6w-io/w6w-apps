import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, describeKeyProblem } from "../../auth/api-key.ts";
import { errorBody, LIVE_KEY, mockCtx, SANDBOX_KEY } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, key: string): SignableRequest {
  const { ctx } = mockCtx([]);
  return apiKey.sign!({ request, credential: { apiKey: key } } as never, ctx) as SignableRequest;
}

Deno.test("auth: declares a bearer scheme with a single secret field", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
  const fields = apiKey.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
});

/**
 * The environment is derived, never asked for. A second "environment" field
 * would be a way for the user to contradict their own key.
 */
Deno.test("auth: there is no environment field to get wrong", () => {
  const keys = (apiKey.fields ?? []).map((f) => f.key.toLowerCase());
  assert(!keys.some((k) => /environment|sandbox|host|base/.test(k)), keys.join(","));
});

Deno.test("authHeaders: builds the documented bearer header", () => {
  assertEquals(authHeaders({ apiKey: LIVE_KEY }), { authorization: `Bearer ${LIVE_KEY}` });
});

Deno.test("sign: stamps the bearer header and rewrites the host for a live key", () => {
  const request = { url: "https://api.paddle.com/products", headers: {} as Record<string, string> };
  const signed = signWith(request, LIVE_KEY);
  assertEquals(signed.headers["authorization"], `Bearer ${LIVE_KEY}`);
  assertEquals(new URL(signed.url).hostname, "api.paddle.com");
});

/**
 * The load-bearing case: a sandbox key must never reach production, whatever
 * host the client happened to build the URL against.
 */
Deno.test("sign: a sandbox key redirects the request to the sandbox host", () => {
  const request = {
    url: "https://api.paddle.com/products?per_page=5",
    headers: {} as Record<string, string>,
  };
  const signed = signWith(request, SANDBOX_KEY);
  const url = new URL(signed.url);
  assertEquals(url.hostname, "sandbox-api.paddle.com");
  assertEquals(url.pathname, "/products");
  assertEquals(url.searchParams.get("per_page"), "5", "the rewrite must not lose the query");
});

Deno.test("sign: a malformed request URL is left alone rather than redirected", () => {
  const request = { url: "not-a-url", headers: {} as Record<string, string> };
  const signed = signWith(request, LIVE_KEY);
  assertEquals(signed.url, "not-a-url");
  assertEquals(signed.headers["authorization"], `Bearer ${LIVE_KEY}`);
});

Deno.test("describeKeyProblem: accepts a well-formed key of either environment", () => {
  assertEquals(describeKeyProblem(LIVE_KEY), undefined);
  assertEquals(describeKeyProblem(SANDBOX_KEY), undefined);
});

/**
 * Each of these is a credential somebody actually has lying around next to
 * their API key. Naming which one they pasted is the whole point.
 */
Deno.test("describeKeyProblem: names a legacy key as a legacy key", () => {
  const msg = describeKeyProblem("a".repeat(50))!;
  assert(msg.includes("legacy"), msg);
  assert(msg.includes("6 May 2025"), msg);
});

Deno.test("describeKeyProblem: names a client-side token as a client-side token", () => {
  const msg = describeKeyProblem("pdl_live_ctkn_01gtgztp8f4kek3yd4g1wrksa3_q6TGTJyvo")!;
  assert(msg.includes("client-side token"), msg);
});

Deno.test("describeKeyProblem: points a Paddle Classic credential at the right product", () => {
  const msg = describeKeyProblem("0123456789abcdef0123456789abcdef")!;
  assert(msg.includes("Classic"), msg);
});

Deno.test("describeKeyProblem: an empty key is missing, not malformed", () => {
  assertEquals(describeKeyProblem(""), "credential missing apiKey");
});

/**
 * The probe is pinned by path AND by host, because both are chosen: the path
 * because `/event-types` is the only endpoint requiring a credential but no
 * permission, and the host because the key says which environment to check.
 */
Deno.test("test: probes /event-types on the host the key selects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const result = await apiKey.test!({ credential: { apiKey: SANDBOX_KEY } } as never, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://sandbox-api.paddle.com/event-types");
  assertEquals(calls[0].headers["authorization"], `Bearer ${SANDBOX_KEY}`);
});

Deno.test("test: rejects a malformed key without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { apiKey: "nope" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0, "a key that cannot be valid must not be sent anywhere");
});

Deno.test("test: reports a rejected key with Paddle's own error code", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody(
        "authentication_malformed",
        "Authentication header included, but incorrectly formatted.",
      ),
    },
  ]);
  const result = await apiKey.test!({ credential: { apiKey: LIVE_KEY } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("authentication_malformed"), result.message);
});

Deno.test("test: a 403 forbidden is reported with its detail rather than as a bad key", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("forbidden", "You aren't permitted to perform this request.") },
  ]);
  const result = await apiKey.test!({ credential: { apiKey: LIVE_KEY } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("permitted"), result.message);
});

Deno.test("afterConnect: publishes the environment and host, and nothing else", () => {
  const display = apiKey.afterConnect!(
    { credential: { apiKey: SANDBOX_KEY } } as never,
    mockCtx([]).ctx,
  );
  assertEquals(display, { environment: "sandbox", host: "sandbox-api.paddle.com" });
});

/** A key whose environment is unknowable publishes nothing rather than guessing. */
Deno.test("afterConnect: a legacy key publishes no environment", () => {
  const display = apiKey.afterConnect!(
    { credential: { apiKey: "a".repeat(50) } } as never,
    mockCtx([]).ctx,
  );
  assertEquals(display, {});
});

/** `afterConnect` must not leak the credential into the redacted display block. */
Deno.test("afterConnect: never republishes the key", () => {
  const display = apiKey.afterConnect!(
    { credential: { apiKey: LIVE_KEY } } as never,
    mockCtx([]).ctx,
  );
  assert(!JSON.stringify(display).includes(LIVE_KEY));
});
