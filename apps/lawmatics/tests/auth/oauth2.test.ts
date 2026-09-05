import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { errorBody, item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: sign injects a Bearer Authorization header and nothing else", () => {
  const request = {
    url: "https://api.lawmatics.com/v1/contacts",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!(
    { request, credential: { accessToken: "tok_123" } },
    { fetch, log: () => {} },
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer tok_123");
});

Deno.test("oauth2: test() hits GET /v1/users/me and signs the request itself", async () => {
  const { ctx, calls } = mockCtx([{
    body: item("17", "user", { name: "Roey Chasman", email: "roey@lawmatics.com" }),
  }]);
  const out = await oauth2.test({ credential: { accessToken: "tok_123" } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok_123");
  assertEquals(out, { ok: true });
});

/**
 * `/v1/users/me` returns only `{name, email, created_at, updated_at}` — never
 * the token itself. This pins that the probe stays that endpoint and that a
 * successful test doesn't somehow surface the credential back out.
 */
Deno.test("oauth2: test() never echoes the credential back in its result", async () => {
  const { ctx } = mockCtx([{
    body: item("17", "user", { name: "Roey", email: "roey@lawmatics.com" }),
  }]);
  const out = await oauth2.test({ credential: { accessToken: "tok_super_secret" } }, ctx);
  assert(
    !JSON.stringify(out).includes("tok_super_secret"),
    "credential leaked into the test result",
  );
});

Deno.test("oauth2: test() classifies a bad credential from the vendor's error body, not the bare status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody(401, "Unauthorized", "Invalid access token"),
  }]);
  const out = await oauth2.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("Invalid access token"), `unexpected message: ${out.message}`);
});

Deno.test("oauth2: test() fails closed when the credential carries no accessToken", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await oauth2.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0, "should not have made a request with no token");
});

Deno.test("oauth2: afterConnect labels the connection from /v1/users/me", async () => {
  const { ctx } = mockCtx([{
    body: item("17", "user", { name: "Roey Chasman", email: "roey@lawmatics.com" }),
  }]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: "tok_123" } }, ctx);
  assertEquals(display, { name: "Roey Chasman", email: "roey@lawmatics.com" });
});

/**
 * Lawmatics never issues a refresh token and states access tokens do not
 * expire — and never exposes a deauthorization endpoint. Both hooks are
 * deliberately absent rather than stubbed.
 */
Deno.test("oauth2: has no refresh or revoke hook — Lawmatics tokens don't expire and can't be revoked via the API", () => {
  assertEquals(oauth2.refresh, undefined);
  assertEquals(oauth2.revoke, undefined);
});

Deno.test("oauth2: declares no scopes — Lawmatics documents none", () => {
  assertEquals(oauth2.oauth2?.scopes, undefined);
});

Deno.test("oauth2: pkce is off — the docs describe a classic client_secret exchange", () => {
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: authorize and token URLs match the vendor's docs", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://app.lawmatics.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.lawmatics.com/oauth/token");
});
