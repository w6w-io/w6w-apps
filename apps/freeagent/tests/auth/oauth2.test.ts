import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: config points at FreeAgent's approve_app / token_endpoint", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://api.freeagent.com/v2/approve_app");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.freeagent.com/v2/token_endpoint");
  assertEquals(auth.oauth2?.refreshUrl, "https://api.freeagent.com/v2/token_endpoint");
});

Deno.test("sign: stamps Authorization from the credential's accessToken", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://api.freeagent.com/v2/users/me", method: "GET", headers: {} };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test rejects a response missing accessToken", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
});

Deno.test("oauth2: test rejects a non-ok response from /users/me", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { error: "invalid_token" } }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls[0].url, "https://api.freeagent.com/v2/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test rejects a response carrying no user", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ctx), {
    ok: false,
    message: "response carried no user",
  });
});

Deno.test("oauth2: test accepts a live token", async () => {
  const { ctx } = mockCtx([{ body: { user: { email: "dev@example.com" } } }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ctx), { ok: true });
});

Deno.test("oauth2: afterConnect records the connected user's email and name", async () => {
  const { ctx } = mockCtx([{
    body: { user: { email: "dev@example.com", first_name: "Dev", last_name: "Team" } },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.userEmail, "dev@example.com");
  assertEquals(out.userName, "Dev Team");
});

Deno.test("oauth2: afterConnect degrades to {} when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx), {});
});

/**
 * The credential-rotation gotcha this app's own doc comment flags: FreeAgent's
 * refresh response carries a NEW refresh_token, not just a new access token.
 * There is no custom `refresh` hook here (the host's default handler already
 * persists whatever the token endpoint returns), so this test pins the
 * absence — a future custom `refresh` that discards the new token would be
 * the actual bug this guards against reintroducing.
 */
Deno.test("oauth2: declares no custom refresh hook, deferring entirely to the host default", () => {
  assertEquals(auth.refresh, undefined);
});
