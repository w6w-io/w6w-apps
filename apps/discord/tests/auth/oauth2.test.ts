import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Discord authorize/token endpoints and PKCE", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://discord.com/api/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://discord.com/api/oauth2/token");
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: requests default scopes covering identify/guilds/members/bot", () => {
  const scopes = auth.oauth2?.scopes ?? [];
  for (const required of ["identify", "guilds", "guilds.members.read", "bot"]) {
    assert(scopes.includes(required), `missing scope ${required}`);
  }
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0, "must not make a network call when credential is malformed");
});

Deno.test("oauth2: test issues GET /users/@me with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "u1" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/users/@me");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test returns the upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
