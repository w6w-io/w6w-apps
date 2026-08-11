import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import accessToken, { authHeaders, probeHeaders } from "../../auth/access-token.ts";
import { ACCEPT, USER_AGENT } from "../../lib/client.ts";
import { errorBody, mockCtx, q, TEST_TOKEN, url } from "../_helpers.ts";

const cred = { accessToken: TEST_TOKEN };

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest): SignableRequest {
  const { ctx } = mockCtx([]);
  return accessToken.sign!({ request, credential: cred }, ctx) as SignableRequest;
}

Deno.test("auth: declares a bearer method with a single secret field", () => {
  assertEquals(accessToken.key, "access-token");
  assertEquals(accessToken.type, "bearer");
  assertEquals(accessToken.fields?.length, 1);
  const field = accessToken.fields![0];
  assertEquals(field.key, "accessToken");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("auth: sign stamps the bearer header and nothing else", () => {
  const signed = signWith({
    url: "https://api.vimeo.com/me?fields=uri",
    method: "GET",
    headers: {},
  });
  assertEquals(signed.headers.authorization, `Bearer ${TEST_TOKEN}`);
  assertEquals(Object.keys(signed.headers), ["authorization"]);
  // The URL is untouched: Vimeo is one fixed host, so `sign` has nothing to rewrite.
  assertEquals(signed.url, "https://api.vimeo.com/me?fields=uri");
});

Deno.test("auth: sign overwrites an existing authorization header rather than appending", () => {
  const signed = signWith({
    url: "https://api.vimeo.com/me",
    method: "GET",
    headers: { authorization: "Bearer stale", accept: ACCEPT },
  });
  assertEquals(signed.headers.authorization, `Bearer ${TEST_TOKEN}`);
  // The client's own headers survive signing.
  assertEquals(signed.headers.accept, ACCEPT);
});

Deno.test("auth: a missing token never yields a header with an empty bearer on the wire", () => {
  // `authHeaders` tolerates the shape, but `test` refuses before it can be sent.
  assertEquals(authHeaders({}).authorization, "Bearer ");
});

Deno.test("auth: probeHeaders match what VimeoClient sends, plus the credential", () => {
  const headers = probeHeaders(cred);
  assertEquals(headers.accept, ACCEPT);
  assertEquals(headers["user-agent"], USER_AGENT);
  assertEquals(headers.authorization, `Bearer ${TEST_TOKEN}`);
});

Deno.test("auth: test refuses an empty credential without touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await accessToken.test({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0, "a missing token must not cause a request");
});

/**
 * The probe must be the FILTERED /me. An unfiltered one would return
 * `preferences.videos.password` in cleartext into a health report.
 */
Deno.test("auth: test probes /me with fields=uri,name and the versioned Accept", async () => {
  const { ctx, calls } = mockCtx([{ body: { uri: "/users/152184", name: "Test" } }]);
  const result = await accessToken.test({ credential: cred } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(url(calls[0]).pathname, "/me");
  assertEquals(q(calls[0], "fields"), "uri,name");
  assertEquals(calls[0].headers.accept, ACCEPT);
  assertEquals(calls[0].headers.authorization, `Bearer ${TEST_TOKEN}`);
});

Deno.test("auth: a 200 that is not a user representation is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { something: "else" } }]);
  const result = await accessToken.test({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("no user URI"), result.message);
});

/**
 * Error code 8002 is a different problem from 8003 and needs a different fix:
 * the token is real but not bound to a user (a client-credentials token), so
 * re-pasting it will never help.
 */
Deno.test("auth: error 8002 is reported as an unauthenticated-token problem", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(8002, "No user is associated with the access token.") },
  ]);
  const result = await accessToken.test({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("not bound to a Vimeo user"), result.message);
  assert(result.message?.includes("8002"), result.message);
});

Deno.test("auth: a plain 401 is reported as a rejected token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(8003, "The app didn't receive the user's credentials.") },
  ]);
  const result = await accessToken.test({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"), result.message);
  assert(result.message?.includes("8003"), result.message);
});

Deno.test("auth: a 403 is reported as a scope problem, not a bad token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(3200, "Forbidden.") }]);
  const result = await accessToken.test({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("scopes"), result.message);
});

Deno.test("auth: an unexpected status falls back to the formatted Vimeo error", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "upstream down" }]);
  const result = await accessToken.test({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("503"), result.message);
});

Deno.test("auth: no failure message ever echoes the token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(8003, "nope") },
    { status: 403, body: errorBody(3200, "nope") },
    { status: 503, body: "nope" },
    { body: { something: "else" } },
  ]);
  for (let i = 0; i < 4; i++) {
    const result = await accessToken.test({ credential: cred } as never, ctx);
    assertEquals(result.ok, false);
    assert(!(result.message ?? "").includes(TEST_TOKEN), "a test message echoed the credential");
  }
});

Deno.test("auth: afterConnect publishes only the filtered name and uri", async () => {
  const { ctx, calls } = mockCtx([{ body: { uri: "/users/152184", name: "Test Account" } }]);
  const display = await accessToken.afterConnect!({ credential: cred } as never, ctx);
  assertEquals(display, { name: "Test Account", uri: "/users/152184" });
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("auth: afterConnect publishes nothing when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(8003, "nope") }]);
  assertEquals(await accessToken.afterConnect!({ credential: cred } as never, ctx), {});
});

Deno.test("auth: afterConnect makes no request without a credential", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await accessToken.afterConnect!({ credential: {} } as never, ctx), {});
  assertEquals(calls.length, 0);
});

/**
 * Whatever `afterConnect` returns is stored on the redacted Connection and
 * rendered in a UI. Because the probe is filtered to two scalar fields, a
 * password cannot reach it even if Vimeo returned one.
 */
Deno.test("auth: afterConnect cannot publish a password even if the API sends one", async () => {
  const { ctx } = mockCtx([{
    body: { uri: "/users/152184", name: "Test", preferences: { videos: { password: "hunter1" } } },
  }]);
  const display = await accessToken.afterConnect!({ credential: cred } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(Object.keys(display).sort(), ["name", "uri"]);
  assert(!JSON.stringify(display).includes("hunter1"));
});
