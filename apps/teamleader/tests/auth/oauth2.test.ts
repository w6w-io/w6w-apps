import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { AUTHORIZE_URL, TOKEN_URL } from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Teamleader authorize/token endpoints, on the app host", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(AUTHORIZE_URL, "https://focus.teamleader.eu/oauth2/authorize");
  assertEquals(TOKEN_URL, "https://focus.teamleader.eu/oauth2/access_token");
  assertEquals(auth.oauth2?.authorizationUrl, AUTHORIZE_URL);
  assertEquals(auth.oauth2?.tokenUrl, TOKEN_URL);
});

Deno.test("oauth2: declares no scopes — Teamleader's authorize endpoint takes no scope param", () => {
  assertEquals(auth.oauth2?.scopes, undefined);
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at-xyz");
});

Deno.test("oauth2: test with missing accessToken reports the failure without a fetch", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test POSTs users.me with the bearer token and accepts 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "u1" } } }]);
  const result = await auth.test({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "api.focus.teamleader.eu");
  assertEquals(url.pathname, "/users.me");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], "Bearer at-xyz");
});

Deno.test("oauth2: test reports a 401 as an expired/revoked token, not a generic failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [{ title: "invalid_token" }] } }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("expired or revoked"));
});

Deno.test("oauth2: afterConnect surfaces name/account id and never the raw credential", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: {
        id: "u1",
        account: { id: "acct-1", type: "account" },
        first_name: "John",
        last_name: "Smith",
        email: "john@teamleader.eu",
      },
    },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out, {
    first_name: "John",
    last_name: "Smith",
    account_id: "acct-1",
    email: "john@teamleader.eu",
  });
  assert(!JSON.stringify(out).includes("at-xyz"));
});

Deno.test("oauth2: afterConnect fails silently, never throwing, when users.me errors", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out, {});
});

Deno.test("oauth2: the credential field the runtime stores is never a form field (host-supplied token)", () => {
  // OAuth2 tokens are minted by the exchange, not typed in by the user — no
  // `fields` should be declared, unlike apiKey/basic auth methods.
  assertEquals(auth.fields, undefined);
});
