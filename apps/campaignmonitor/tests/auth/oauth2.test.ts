import { assert, assertEquals } from "@std/assert";
import oauth2, { OAUTH_CODE_MEANINGS, SCOPES } from "../../auth/oauth2.ts";
import type { HookContext } from "@w6w/types";
import { API_PATH, errorBody, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The three non-standard details, pinned. A generic OAuth2 client gets each of
 * them wrong, and each failure is silent until a user tries to connect.
 */
Deno.test("oauth2: the authorization endpoint is /oauth, not /oauth/authorize", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.createsend.com/oauth");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.createsend.com/oauth/token");
  assertEquals(oauth2.oauth2?.refreshUrl, "https://api.createsend.com/oauth/token");
});

Deno.test("oauth2: scopes are comma-separated, not the RFC 6749 space", () => {
  assertEquals(oauth2.oauth2?.scopeSeparator, ",");
  // The vendor's own worked example: SendCampaigns,ViewReports
  assertEquals(
    ["SendCampaigns", "ViewReports"].join(oauth2.oauth2!.scopeSeparator!),
    "SendCampaigns,ViewReports",
  );
});

Deno.test("oauth2: type=web_server is sent as an extra authorize parameter", () => {
  assertEquals(oauth2.oauth2?.extraAuthParams, { type: "web_server" });
});

/**
 * PKCE is undocumented by this vendor and the token exchange it does document
 * carries client_secret — a confidential client.
 */
Deno.test("oauth2: PKCE is off", () => {
  assertEquals(oauth2.oauth2?.pkce, false);
});

/** All twelve documented permissions, and nothing invented. */
Deno.test("oauth2: declares exactly the twelve documented permissions", () => {
  assertEquals(SCOPES.length, 12);
  assertEquals(oauth2.oauth2?.scopes, SCOPES);
  for (const s of SCOPES) assert(/^[A-Z][A-Za-z]+$/.test(s), `malformed scope: ${s}`);
  assertEquals(new Set(SCOPES).size, 12, "duplicate scope");
});

// --- sign -------------------------------------------------------------------

Deno.test("oauth2: sign stamps a bearer header", () => {
  const request = { method: "GET", url: "https://x", headers: {} as Record<string, string> };
  const signed = oauth2.sign!(
    { request, credential: { access_token: "MDRmODIzNTBhODQ1ZWU5ZDkz" } } as never,
    {} as HookContext,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer MDRmODIzNTBhODQ1ZWU5ZDkz");
});

/** The host may normalise the exchange response to `token`; both shapes must sign. */
Deno.test("oauth2: sign accepts either access_token or token", () => {
  const request = { method: "GET", url: "https://x", headers: {} as Record<string, string> };
  const signed = oauth2.sign!(
    { request, credential: { token: "abc" } } as never,
    {} as HookContext,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer abc");
});

Deno.test("oauth2: sign makes no request", () => {
  const { ctx, calls } = mockCtx([]);
  oauth2.sign!(
    {
      request: { method: "GET", url: "https://x", headers: {} as Record<string, string> },
      credential: { access_token: "t" },
    } as never,
    ctx,
  );
  assertEquals(calls.length, 0);
});

// --- test -------------------------------------------------------------------

Deno.test("oauth2: test probes /systemdate.json with a bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: { SystemDate: "2026-08-11 06:18:33" } }]);
  const result = await oauth2.test({ credential: { access_token: "t" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), `${API_PATH}/systemdate.json`);
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

/**
 * The three OAuth codes are distinct problems with distinct fixes, and only 121
 * is recoverable by refreshing. Derived from the exported map so a fourth code
 * is covered the moment it is added.
 */
Deno.test("oauth2: each OAuth failure code produces its own message", async () => {
  const codes = Object.keys(OAUTH_CODE_MEANINGS).map(Number);
  assertEquals(codes.sort(), [120, 121, 122]);
  for (const code of codes) {
    const { ctx } = mockCtx([{ status: 401, body: errorBody(code, "…") }]);
    const result = await oauth2.test({ credential: { access_token: "t" } }, ctx);
    assertEquals(result.ok, false);
    assert(result.message!.includes(`code ${code}`), result.message);
    assert(result.message!.includes(OAUTH_CODE_MEANINGS[code]), result.message);
  }
  // Only the expired one is described as refreshable.
  assert(OAUTH_CODE_MEANINGS[121].includes("refresh"));
  assert(!OAUTH_CODE_MEANINGS[120].includes("refresh"));
});

/** Code 100 to a bearer means the token never arrived as a bearer. */
Deno.test("oauth2: code 100 is reported as the token not reaching the request", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(100, "Invalid API Key") }]);
  const result = await oauth2.test({ credential: { access_token: "t" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("did not reach the request as a bearer"), result.message);
});

Deno.test("oauth2: a missing token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: the token never reaches the test result", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(122, "Revoked OAuth Token") }]);
  const result = await oauth2.test({ credential: { access_token: "super-secret-token" } }, ctx);
  assert(
    !JSON.stringify(result).includes("super-secret-token"),
    "the token was echoed back: " + JSON.stringify(result),
  );
});

// --- afterConnect -----------------------------------------------------------

Deno.test("oauth2: afterConnect labels from /clients.json and never fails a connection", async () => {
  const { ctx } = mockCtx([{ body: [{ ClientID: "c1", Name: "Client One" }] }]);
  const meta = await oauth2.afterConnect!(
    { credential: { access_token: "t" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(meta.label, "Campaign Monitor (Client One)");

  const { ctx: ctx2 } = mockCtx([{ throws: "network down" }]);
  assertEquals(
    await oauth2.afterConnect!({ credential: { access_token: "t" } } as never, ctx2),
    {},
  );
});

Deno.test("oauth2: declares no user-entered fields", () => {
  assertEquals(oauth2.key, "oauth2");
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.fields ?? [], []);
});
