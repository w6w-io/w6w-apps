import { assert, assertEquals } from "@std/assert";
import oauth2, { authHeaders } from "../../auth/oauth2.ts";
import { BAD_TOKEN_BODY, mockCtx, pathOf, UNAUTHORIZED_BODY } from "../_helpers.ts";

const TOKEN = "ae261404-11r4-47c0-bce3-unitTestFixtureNotReal";

Deno.test("oauth2: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.raindrop.io/rest/v1/user",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ accessToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

/**
 * The declared URLs are the ones the documented endpoints 307-redirect to
 * (`https://raindrop.io/oauth/access_token` →
 * `https://api.raindrop.io/v1/oauth/access_token`, measured 2026-08-11), and the
 * path is `/v1/oauth`, NOT `/rest/v1/oauth`. A credential-bearing POST should not
 * depend on a redirect being followed with its method and body intact.
 */
Deno.test("oauth2: the endpoints are the api.raindrop.io targets, outside the REST prefix", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.raindrop.io/v1/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.raindrop.io/v1/oauth/access_token");
  assertEquals(oauth2.oauth2?.refreshUrl, "https://api.raindrop.io/v1/oauth/access_token");
  for (const url of [oauth2.oauth2?.authorizationUrl, oauth2.oauth2?.tokenUrl]) {
    assert(!url!.includes("/rest/"), `${url} picked up the REST prefix`);
  }
});

/** Raindrop documents no scope parameter and no PKCE. Inventing either is worse. */
Deno.test("oauth2: declares no scopes and no PKCE", () => {
  assertEquals(oauth2.oauth2?.scopes, undefined);
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: test passes when /user answers with a user", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: true, user: { _id: 32 } } }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/rest/v1/user");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

/**
 * **The finding.** Raindrop's token endpoint answers HTTP 200 even when the
 * exchange fails — the failure is in the body
 * (`{"result": false, "status": 400, "errorMessage": "client_id or client_secret
 * is invalid"}`, measured) — so a host that trusts `res.ok` can store an empty
 * credential. This branch is the app's chance to say so before any Action runs,
 * which makes its wording load-bearing.
 */
Deno.test("oauth2: an empty credential is reported with the 200-on-failure cause", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 200/.test(result.message ?? ""), result.message);
  assert(/exchange/i.test(result.message ?? ""), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: the two 401 bodies produce two different messages", async () => {
  const missing = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  const rejected = mockCtx([{ status: 401, body: BAD_TOKEN_BODY }]);

  const a = await oauth2.test({ credential: { accessToken: TOKEN } }, missing.ctx);
  const b = await oauth2.test({ credential: { accessToken: TOKEN } }, rejected.ctx);

  assert(a.message !== b.message, "the two 401 cases were flattened into one message");
  assert(/access token/.test(b.message ?? ""), b.message);
});

Deno.test("oauth2: a failure message never contains the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: BAD_TOKEN_BODY }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);

  assert(!(result.message ?? "").includes(TOKEN), result.message);
});

Deno.test("oauth2: afterConnect publishes the name and drops the email", async () => {
  const { ctx } = mockCtx([{
    body: { result: true, user: { _id: 32, fullName: "Rustem", email: "some@email.com" } },
  }]);
  const out = await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(out, { fullName: "Rustem", userId: 32 });
  assertEquals(JSON.stringify(out).includes("some@email.com"), false);
});

/**
 * No `refresh` hook, deliberately: the refresh call needs the *application's*
 * client secret, which an App never holds — the host does. A hook that had to
 * invent one would be worse than absent, so `refreshUrl` is declared instead.
 */
Deno.test("oauth2: declares refreshUrl and implements no refresh hook", () => {
  assertEquals(typeof oauth2.refresh, "undefined");
  assert(oauth2.oauth2?.refreshUrl, "no refreshUrl for the two-week expiry");
});
