import { assert, assertEquals } from "@std/assert";
import accessToken, { authHeaders, PROBE_PATH } from "../../auth/access-token.ts";
import { errorBody, mockCtx, SITE_URL, TOKEN } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, credential: Record<string, unknown>): SignableRequest {
  const { ctx } = mockCtx([]);
  return accessToken.sign!({ request, credential } as never, ctx) as SignableRequest;
}

Deno.test("auth: declares a bearer scheme carrying the URL and the token", () => {
  assertEquals(accessToken.key, "access-token");
  assertEquals(accessToken.type, "bearer");
  const fields = accessToken.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["siteUrl", "token"]);
  // The token is masked; the URL is an address, not a secret, and masking it
  // would make a typo impossible to spot.
  assertEquals(fields.find((f) => f.key === "token")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "siteUrl")?.type, "string");
});

Deno.test("authHeaders: builds the Bearer header the vendor's curl shows", () => {
  assertEquals(authHeaders({ token: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("sign: stamps the bearer header and leaves the URL alone", () => {
  const request = { url: `${SITE_URL}/api/v4/posts`, headers: {} as Record<string, string> };
  const signed = signWith(request, { siteUrl: SITE_URL, token: TOKEN });
  assertEquals(signed.headers["authorization"], `Bearer ${TOKEN}`);
  assertEquals(signed.url, `${SITE_URL}/api/v4/posts`);
});

/**
 * The probe is pinned by path. `/api/v4/users/me` was chosen because it needs a
 * credential, needs no other permission, and returns no token.
 */
Deno.test("test: probes /api/v4/users/me on the server the credential names", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", username: "w6w-bot" } }]);
  const result = await accessToken.test!(
    { credential: { siteUrl: SITE_URL, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, `${SITE_URL}${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], `Bearer ${TOKEN}`);
});

Deno.test("test: a trailing /api/v4 in the pasted URL is normalised before probing", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", username: "bot" } }]);
  await accessToken.test!(
    { credential: { siteUrl: `${SITE_URL}/api/v4`, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(calls[0].url, `${SITE_URL}${PROBE_PATH}`);
});

Deno.test("test: reports a missing half of the credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await accessToken.test!({ credential: { token: TOKEN } } as never, ctx)).ok, false);
  assertEquals(
    (await accessToken.test!({ credential: { siteUrl: SITE_URL } } as never, ctx)).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

/**
 * Personal access tokens do not expire, so a `session_expired` id means revoked
 * or disabled — and saying that is more useful than repeating the vendor's
 * wording about sessions.
 */
Deno.test("test: explains a 401 in terms of a token that cannot expire", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody("api.context.session_expired.app_error", "Invalid or expired session"),
    },
  ]);
  const result = await accessToken.test!(
    { credential: { siteUrl: SITE_URL, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("do not expire"), result.message);
  assert(result.message!.includes("revoked"), result.message);
});

Deno.test("test: a permission error is reported with its own id, not as an expired token", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("api.context.permissions.app_error", "No permission", 403) },
  ]);
  const result = await accessToken.test!(
    { credential: { siteUrl: SITE_URL, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("api.context.permissions.app_error"), result.message);
});

Deno.test("test: a 404 means nothing Mattermost-shaped is routed at this URL", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await accessToken.test!(
    { credential: { siteUrl: SITE_URL, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("No Mattermost at this URL"), result.message);
});

/** Mattermost is very commonly behind a reverse proxy, so this is not theoretical. */
Deno.test("test: a 200 that is not a user record is rejected", async () => {
  const { ctx } = mockCtx([{ body: { message: "welcome" } }]);
  const result = await accessToken.test!(
    { credential: { siteUrl: SITE_URL, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("is this URL Mattermost?"), result.message);
});

Deno.test("afterConnect: records the origin, host, acting user and server version", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", username: "w6w-bot", roles: "system_user", email: "bot@example.com" },
    headers: { "content-type": "application/json", "x-version-id": "11.11.0.31364844342.abc.true" },
  }]);
  const display = await accessToken.afterConnect!(
    { credential: { siteUrl: `${SITE_URL}/`, token: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.siteUrl, SITE_URL);
  assertEquals(display.site, { host: "mattermost.example.com" });
  assertEquals(display.user, { id: "u1", username: "w6w-bot", roles: "system_user" });
  assertEquals(display.server, { version: "11.11.0" });
});

/**
 * The display block is shown wherever the Connection is. The token must never
 * appear, and neither should the person's email or their identity-provider id.
 */
Deno.test("afterConnect: publishes no token, no email and no auth_data", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "u1",
      username: "w6w-bot",
      email: "bot@example.com",
      auth_data: "ldap-uid-4321",
      auth_service: "ldap",
    },
  }]);
  const display = await accessToken.afterConnect!(
    { credential: { siteUrl: SITE_URL, token: TOKEN } } as never,
    ctx,
  );
  const json = JSON.stringify(display);
  assert(!json.includes(TOKEN), "republished the token");
  assert(!json.includes("bot@example.com"), "republished the user's email");
  assert(!json.includes("ldap-uid-4321"), "republished the identity-provider id");
});

Deno.test("afterConnect: a failed lookup still records the URL", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("x", "nope") }]);
  const display = await accessToken.afterConnect!(
    { credential: { siteUrl: SITE_URL, token: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.siteUrl, SITE_URL);
  assertEquals(display.user, undefined);
});
