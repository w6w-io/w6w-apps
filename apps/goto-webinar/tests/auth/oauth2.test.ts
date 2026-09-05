import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/oauth2.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: declares GoTo's shared OAuth endpoints with PKCE off", () => {
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://authentication.logmeininc.com/oauth/authorize",
  );
  assertEquals(auth.oauth2?.tokenUrl, "https://authentication.logmeininc.com/oauth/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://authentication.logmeininc.com/oauth/token");
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: sign sets the Bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.getgo.com/G2W/rest/v2/organizers/1/webinars",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!({ request, credential: { accessToken: "tok" } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "Bearer tok");
});

Deno.test("oauth2: test passes when the identity whoami answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "123", userName: "a@b.com" } }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/identity/v1/Users/me");
  assertEquals(calls[0].headers.authorization, "Bearer tok");
});

Deno.test("oauth2: test fails with no accessToken, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Verified live 2026-09-05: the identity whoami answers an EMPTY body on failure, so the only
 * classification signal is the RFC 6750 `WWW-Authenticate` challenge header. A test asserting
 * only `result.ok === false` would pass even if this fell back to a bare status-code message —
 * it must actually surface the challenge's `error`/`error_description`.
 */
Deno.test("oauth2: test classifies an empty-body failure from the WWW-Authenticate header", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      headers: {
        "www-authenticate": 'error="invalid_token",error_description="The access token is invalid"',
      },
      // no body — matches the live-verified shape
    },
  ]);
  const result = await auth.test({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/invalid_token/.test(result.message ?? ""), result.message);
  assert(/access token is invalid/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: test falls back to a plain HTTP-status message with no body and no challenge", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: afterConnect captures organizerKey (the identity user's id) and display name", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "42", userName: "a@b.com", displayName: "Ada", name: { givenName: "Ada" } } },
  ]);
  const display = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(pathOf(calls[0].url), "/identity/v1/Users/me");
  assertEquals(display, { organizerKey: "42", user: { name: "Ada", email: "a@b.com" } });
});

Deno.test("oauth2: afterConnect stays silent when the whoami fails or carries no id", async () => {
  const { ctx: failCtx } = mockCtx([{ status: 401 }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "tok" } }, failCtx), {});

  const { ctx: emptyCtx } = mockCtx([{ body: { userName: "a@b.com" } }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "tok" } }, emptyCtx), {});
});
