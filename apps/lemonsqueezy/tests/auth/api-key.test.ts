import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { envelope, errorBody, mockCtx } from "../_helpers.ts";

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

/** No environment field — a test/live key both hit the same host. */
Deno.test("auth: there is no environment/host field to get wrong", () => {
  const keys = (apiKey.fields ?? []).map((f) => f.key.toLowerCase());
  assert(!keys.some((k) => /environment|sandbox|host|base/.test(k)), keys.join(","));
});

Deno.test("authHeaders: builds a plain bearer header", () => {
  assertEquals(authHeaders({ apiKey: "abc123" }), { authorization: "Bearer abc123" });
});

Deno.test("sign: stamps the bearer header and leaves the URL untouched", () => {
  const request = {
    url: "https://api.lemonsqueezy.com/v1/products",
    headers: {} as Record<string, string>,
  };
  const signed = signWith(request, "abc123");
  assertEquals(signed.headers["authorization"], "Bearer abc123");
  assertEquals(signed.url, "https://api.lemonsqueezy.com/v1/products");
});

Deno.test("test: probes GET /v1/users/me with the bearer header and both JSON:API headers", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  const result = await apiKey.test!({ credential: { apiKey: "abc123" } } as never, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://api.lemonsqueezy.com/v1/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer abc123");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
});

Deno.test("test: rejects a missing key without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: reports a rejected key using the JSON:API error body's own detail", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("401", "Unauthorized", "Unauthenticated.") },
  ]);
  const result = await apiKey.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("Unauthenticated."), result.message);
  assert(result.message!.includes("401"), result.message);
});

/** The auth probe must never echo the credential back in its result. */
Deno.test("test: the ok/failure message never contains the credential", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("401", "Unauthorized", "Unauthenticated.") },
  ]);
  const result = await apiKey.test!({ credential: { apiKey: "super-secret-key" } } as never, ctx);
  assert(!JSON.stringify(result).includes("super-secret-key"));
});

Deno.test("afterConnect: publishes name/email/testMode from the whoami response", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        meta: { test_mode: true },
        data: {
          type: "users",
          id: "1",
          attributes: { name: "John Doe", email: "john@example.com" },
        },
      },
    },
  ]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: "abc123" } } as never, ctx);
  assertEquals(display, { name: "John Doe", email: "john@example.com", testMode: true });
});

Deno.test("afterConnect: never republishes the key", async () => {
  const { ctx } = mockCtx([
    { body: { meta: { test_mode: false }, data: { type: "users", id: "1", attributes: {} } } },
  ]);
  const display = await apiKey.afterConnect!(
    { credential: { apiKey: "super-secret-key" } } as never,
    ctx,
  );
  assert(!JSON.stringify(display).includes("super-secret-key"));
});

Deno.test("afterConnect: a failed lookup publishes nothing rather than throwing", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("401", "Unauthorized", "Unauthenticated."),
  }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(display, {});
});
