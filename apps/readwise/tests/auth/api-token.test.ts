import { assert, assertEquals } from "@std/assert";
import apiToken, { AUTH_CHECK_URL, authHeaders } from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-token: probes the dedicated, non-leaking auth-check endpoint", () => {
  assertEquals(AUTH_CHECK_URL, "https://readwise.io/api/v2/auth/");
});

Deno.test("api-token: authHeaders uses the Token scheme, not Bearer", () => {
  assertEquals(authHeaders({ accessToken: "abc123" }), { authorization: "Token abc123" });
});

Deno.test("sign: stamps the Authorization header and returns the request", () => {
  const request = {
    url: "https://readwise.io/api/v2/highlights/",
    headers: {} as Record<string, string>,
  };
  const out = apiToken.sign!(
    { request, credential: { accessToken: "abc123" } } as never,
    {} as never,
  );
  assertEquals((out as typeof request).headers.authorization, "Token abc123");
});

Deno.test("test: a 204 with no credential material reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await apiToken.test({ credential: { accessToken: "abc123" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, AUTH_CHECK_URL);
  assertEquals(calls[0].headers.authorization, "Token abc123");
});

Deno.test("test: no credential at all fails before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: an invalid token reports the vendor's own detail message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid token." } }]);
  const result = await apiToken.test({ credential: { accessToken: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("readwise.io/access_token"), result.message);
});

Deno.test("test: a missing credential on the wire reports Readwise's own detail message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { detail: "Authentication credentials were not provided." } },
  ]);
  const result = await apiToken.test({ credential: { accessToken: "x" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"), result.message);
});

Deno.test("test: an unexpected status is reported verbatim", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await apiToken.test({ credential: { accessToken: "x" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"), result.message);
});

Deno.test("the credential field is declared secret", () => {
  for (const f of apiToken.fields ?? []) {
    assertEquals(f.type, "secret");
  }
});

Deno.test("the auth type is apiKey with the Token prefix, not Bearer", () => {
  assertEquals(apiToken.type, "apiKey");
  assertEquals(apiToken.apiKey?.prefix, "Token ");
  assertEquals(apiToken.apiKey?.name, "Authorization");
});
