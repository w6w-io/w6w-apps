import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { mockCtx, pathOf, UNAUTHENTICATED } from "../_helpers.ts";

type Request = { url: string; method: string; headers: Record<string, string> };

const request = (): Request => ({ url: "https://tidycal.com/api/me", method: "GET", headers: {} });

/**
 * Both endpoints are TidyCal's own, quoted from its reference, and both were
 * confirmed live on 2026-08-11 (`/oauth/authorize` answers `invalid_client` to a
 * bogus client; `/oauth/token` dispatches the `authorization_code` and
 * `refresh_token` grants and rejects `password` as unsupported).
 */
Deno.test("oauth2: declares TidyCal's documented endpoints on its own host", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://tidycal.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://tidycal.com/oauth/token");
  assertEquals(oauth2.oauth2?.refreshUrl, "https://tidycal.com/oauth/token");
  for (const url of [oauth2.oauth2!.authorizationUrl, oauth2.oauth2!.tokenUrl]) {
    assertEquals(new URL(url).hostname, "tidycal.com");
  }
});

/**
 * Nothing here is guessed. TidyCal documents no scope vocabulary for a REST
 * client — its only published scope, `mcp:scheduling:read`, belongs to the
 * separate MCP connector — and does not say whether its clients are public, so
 * neither `scopes` nor `pkce` is declared.
 */
Deno.test("oauth2: declares no invented scope and no assumed PKCE", () => {
  assertEquals(oauth2.oauth2?.scopes, undefined);
  assertEquals(oauth2.oauth2?.pkce, undefined);
  assertEquals(oauth2.fields, undefined);
});

Deno.test("oauth2: sign stamps the access token as a bearer", () => {
  const signed = oauth2.sign!(
    { request: request(), credential: { accessToken: "at-123" } } as never,
    undefined as never,
  ) as Request;
  assertEquals(signed.headers["authorization"], "Bearer at-123");
});

Deno.test("oauth2: test probes the same /api/me as the personal token", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "John Doe" } }]);
  const out = await oauth2.test({ credential: { accessToken: "at-123" } } as never, ctx);

  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), "/api/me");
  assertEquals(calls[0].headers["authorization"], "Bearer at-123");
});

Deno.test("oauth2: a missing access token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await oauth2.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

/** An expired access token is the common case, so the message points at refresh. */
Deno.test("oauth2: a 401 suggests reconnecting or refreshing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHENTICATED }]);
  const out = await oauth2.test({ credential: { accessToken: "stale" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(/refresh/i.test(out.message ?? ""), out.message);
});

/**
 * The request is signed by the runtime here, so `afterConnect` builds no header
 * of its own — and keeps the same three fields the personal method publishes.
 */
Deno.test("oauth2: afterConnect publishes the same narrowed label fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      name: "John Doe",
      email: "john@example.com",
      vanity_path: "johndoe",
      currency_symbol: "$",
    },
  }]);
  const out = await oauth2.afterConnect!({} as never, ctx);
  assertEquals(out, { name: "John Doe", email: "john@example.com", vanityPath: "johndoe" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("oauth2: afterConnect stays silent when the read fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  assertEquals(await oauth2.afterConnect!({} as never, ctx), {});
});
