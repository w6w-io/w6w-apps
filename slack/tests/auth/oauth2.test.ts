import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { userScopes } from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Slack v2 OAuth endpoints with PKCE and user scopes", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://slack.com/oauth/v2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://slack.com/api/oauth.v2.access");
  assertEquals(auth.oauth2?.pkce, true);
  assertEquals(auth.oauth2?.scopes, userScopes);
  assert(auth.oauth2?.extraAuthParams?.user_scope);
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure without network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test issues POST /auth.test with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, user: "u", team: "t" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/api/auth.test");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});
