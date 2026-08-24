import { assert, assertEquals } from "@std/assert";
import oauth2, { createClioOAuth } from "../../auth/oauth2.ts";
import oauth2Au from "../../auth/oauth2-au.ts";
import oauth2Ca from "../../auth/oauth2-ca.ts";
import oauth2Eu from "../../auth/oauth2-eu.ts";
import { bearerErrorBody, envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "clio-unit-test-fixture-not-a-real-token";

Deno.test("oauth2: the four regional variants point at the four documented hosts", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://app.clio.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://app.clio.com/oauth/token");
  assertEquals(oauth2Eu.oauth2?.authorizationUrl, "https://eu.app.clio.com/oauth/authorize");
  assertEquals(oauth2Ca.oauth2?.authorizationUrl, "https://ca.app.clio.com/oauth/authorize");
  assertEquals(oauth2Au.oauth2?.authorizationUrl, "https://au.app.clio.com/oauth/authorize");
});

Deno.test("oauth2: keys are unique and the US variant keeps the bare 'oauth2' key", () => {
  const keys = [oauth2, oauth2Eu, oauth2Ca, oauth2Au].map((a) => a.key);
  assertEquals(new Set(keys).size, 4);
  assertEquals(oauth2.key, "oauth2");
  assertEquals(oauth2Eu.key, "oauth2-eu");
  assertEquals(oauth2Ca.key, "oauth2-ca");
  assertEquals(oauth2Au.key, "oauth2-au");
});

/**
 * Clio's own docs describe only client_id/client_secret/redirect_uri — no
 * scope parameter and no mention of PKCE. See `oauth2.ts`'s own doc comment.
 */
Deno.test("oauth2: no scopes are declared and PKCE is off", () => {
  assertEquals(oauth2.oauth2?.scopes, []);
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: sign stamps the bearer header and touches nothing else", () => {
  const request = { method: "GET", url: "https://app.clio.com/api/v4/matters.json", headers: {} };
  const signed = oauth2.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://app.clio.com/api/v4/matters.json");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2: test passes when who_am_i answers", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, name: "Jane Doe" }) }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v4/users/who_am_i.json");
  assertEquals(queryOf(calls[0].url), { fields: "id,name" });
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("oauth2: test fails with no accessToken, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The finding this pack would most regret missing: an expired/invalid bearer
 * token gets the RFC 6750 STRING-error shape, not the documented object one.
 */
Deno.test("oauth2: test reports the RFC 6750 bearer-challenge shape readably", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": 'Bearer realm="Protected by OAuth 2.0", error="invalid_token"',
      },
      body: bearerErrorBody(
        "The access token provided is expired, revoked, malformed or invalid for other reasons.",
      ),
    },
  ]);
  const result = await oauth2.test({ credential: { accessToken: "expired" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("invalid_token"), result.message);
  assert(result.message?.includes("expired, revoked"), result.message);
});

Deno.test("oauth2: test reports the documented object-error shape for a missing header", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("UnauthorizedError", "User is not authorized") },
  ]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("UnauthorizedError"), result.message);
});

Deno.test("oauth2: afterConnect publishes region, id, name and email — nothing else", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: 42, name: "Jane Doe", email: "jane@example.com" }) },
  ]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/users/who_am_i.json");
  assertEquals(display, { region: "us", userId: 42, name: "Jane Doe", email: "jane@example.com" });
});

Deno.test("oauth2: afterConnect still records the region when who_am_i fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(display, { region: "us" });
});

Deno.test("oauth2: afterConnect records the region with no request when there is no token", async () => {
  const { ctx, calls } = mockCtx([]);
  const display = await oauth2Eu.afterConnect!({ credential: {} }, ctx);
  assertEquals(display, { region: "eu" });
  assertEquals(calls.length, 0);
});

Deno.test("createClioOAuth: is a pure factory — two calls for the same region don't share state", () => {
  const a = createClioOAuth("us");
  const b = createClioOAuth("us");
  assertEquals(a.key, b.key);
  assert(a !== b);
});
