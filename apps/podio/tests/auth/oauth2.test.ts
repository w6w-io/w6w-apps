import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import oauth2, { AUTHORIZATION_URL } from "../../auth/oauth2.ts";
import { TOKEN_URL } from "../../auth/app-auth.ts";
import { BAD_TOKEN_401, mockCtx, NO_CREDENTIAL_401, pathOf } from "../_helpers.ts";

const CRED = { accessToken: "user-access-token", refreshToken: "user-refresh-token" };

Deno.test("oauth2: declares the authorize and token endpoints Podio actually serves", () => {
  assertEquals(oauth2.key, "oauth2");
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.oauth2!.authorizationUrl, AUTHORIZATION_URL);
  assertEquals(AUTHORIZATION_URL, "https://podio.com/oauth/authorize");
  // The authorize endpoint is on the www host, not the API host — sending the
  // browser to api.podio.com/oauth/authorize is a 404.
  assert(!AUTHORIZATION_URL.includes("api.podio.com"));
});

/**
 * The host performs this exchange generically, which means form-encoded per
 * RFC 6749 §4.1.3. `/oauth/token/v2` accepts only a JSON body and answers
 * `400 invalid_value: "Invalid value null (null): must be object"` to a form —
 * an error that reads like a bad request rather than a wrong content type.
 */
Deno.test("oauth2: the token URL is the form-encoded endpoint, not the JSON-only /v2", () => {
  assertEquals(oauth2.oauth2!.tokenUrl, "https://api.podio.com/oauth/token");
  assertEquals(oauth2.oauth2!.refreshUrl, "https://api.podio.com/oauth/token");
  assert(!oauth2.oauth2!.tokenUrl.endsWith("/v2"));
  assertEquals(
    oauth2.oauth2!.tokenUrl,
    TOKEN_URL,
    "the two auth methods point at different token endpoints",
  );
});

/**
 * Podio's own OAuth page: "Currently supported is draft-10" — that is
 * draft-ietf-oauth-v2-10 (2010). PKCE is RFC 7636 (2015). There is no
 * code_challenge support to negotiate, so the spec default of true has to be
 * turned off rather than left to be silently ignored.
 */
Deno.test("oauth2: PKCE is explicitly off, because Podio implements OAuth2 draft-10", () => {
  assertEquals(oauth2.oauth2!.pkce, false);
});

/**
 * Podio documents an omitted scope as equivalent to `global:all`, and the user
 * picks the specific orgs/spaces/apps on the consent screen regardless.
 * Narrowing here would break whole action groups to protect nothing.
 */
Deno.test("oauth2: requests no scope, which Podio documents as global:all", () => {
  assertEquals(oauth2.oauth2!.scopes, []);
});

Deno.test("oauth2: collects no fields — the credential comes from the browser flow", () => {
  assertEquals(oauth2.fields, undefined);
});

Deno.test("oauth2 sign: stamps the OAuth2 scheme, the same wire format as app auth", () => {
  const request: SignableRequest = {
    url: "https://api.podio.com/item/1",
    method: "GET",
    headers: {},
  };
  const signed = oauth2.sign!({ request, credential: CRED }, mockCtx().ctx) as SignableRequest;
  assertEquals(signed.headers.authorization, "OAuth2 user-access-token");
  assertEquals(signed.url, "https://api.podio.com/item/1");
});

Deno.test("oauth2 sign: an absent token produces an empty scheme rather than 'undefined'", () => {
  const request: SignableRequest = {
    url: "https://api.podio.com/item/1",
    method: "GET",
    headers: {},
  };
  const signed = oauth2.sign!({ request, credential: {} }, mockCtx().ctx) as SignableRequest;
  assertEquals(signed.headers.authorization, "OAuth2 ");
});

Deno.test("oauth2 test: shares the /oauth/scope probe with app auth", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ ref_type: null, permissions: ["all"] }] }]);
  assertEquals(await oauth2.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/oauth/scope");
  assertEquals(calls[0].headers.authorization, "OAuth2 user-access-token");
});

Deno.test("oauth2 test: separates the two 401s the same way, with an OAuth-specific hint", async () => {
  const missing = mockCtx([{ status: 401, body: NO_CREDENTIAL_401 }]);
  const a = await oauth2.test({ credential: CRED }, missing.ctx);
  assertEquals(a.ok, false);
  assert(a.message!.includes("received no credential"));

  const rejected = mockCtx([{ status: 401, body: BAD_TOKEN_401 }]);
  const b = await oauth2.test({ credential: CRED }, rejected.ctx);
  assertEquals(b.ok, false);
  assert(b.message!.includes("rejected the token"));
  assert(b.message!.includes("8 hours"), "the OAuth-specific lifetime hint was lost");
});

/**
 * `GET /user/status` returns `calendar_code`, the token embedded in the
 * account's iCal feed URL. `GET /user` does not. A display label must not put
 * a bearer secret into the health and connection surfaces.
 */
Deno.test("oauth2 afterConnect: reads /user, not /user/status, and keeps only two fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      user_id: 2050398,
      mail: "a@b.com",
      status: "active",
      locale: "en",
      timezone: "UTC",
      flags: ["god"],
    },
  }]);
  const label = await oauth2.afterConnect!({ credential: CRED }, ctx);
  assertEquals(label, { user: { id: 2050398, mail: "a@b.com" } });
  assertEquals(pathOf(calls[0].url), "/user");
  assert(
    !pathOf(calls[0].url).includes("status"),
    "read /user/status, which returns the account's iCal feed secret",
  );
});

Deno.test("oauth2 afterConnect: a failure, a throw or a bodyless user is silent", async () => {
  const failing = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await oauth2.afterConnect!({ credential: CRED }, failing.ctx), {});

  const throwing = mockCtx([]);
  assertEquals(await oauth2.afterConnect!({ credential: CRED }, throwing.ctx), {});

  const empty = mockCtx([{ body: { user_id: 1 } }]);
  assertEquals(await oauth2.afterConnect!({ credential: CRED }, empty.ctx), {});

  const noToken = mockCtx([]);
  assertEquals(await oauth2.afterConnect!({ credential: {} }, noToken.ctx), {});
});
