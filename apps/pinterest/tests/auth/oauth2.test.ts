import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: sign injects the bearer token", () => {
  const request = {
    method: "GET",
    url: "https://api.pinterest.com/v5/pins",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: "tok-123" } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["authorization"], "Bearer tok-123");
});

Deno.test("oauth2: test fails fast when the credential has no accessToken", async () => {
  const { ctx } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assert(!result.ok);
});

Deno.test("oauth2: test probes GET /user_account and succeeds on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", username: "acme" } }]);
  const result = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v5/user_account");
  assert(result.ok);
});

Deno.test("oauth2: test reports failure on a 401", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(2, "Authentication failed.") }]);
  const result = await oauth2.test({ credential: { accessToken: "bad" } }, ctx);
  assert(!result.ok);
  assert(result.message?.includes("Authentication failed"));
});

Deno.test("oauth2: afterConnect returns the account id and username", async () => {
  const { ctx } = mockCtx([{ body: { id: "1", username: "acme" } }]);
  const result = await oauth2.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result, { user: { id: "1", name: "acme" } });
});

Deno.test("oauth2: afterConnect is silent on failure — test already established liveness", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const result = await oauth2.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result, {});
});

Deno.test("oauth2: scopes are comma-separated, not space-separated", () => {
  assertEquals(oauth2.oauth2?.scopeSeparator, ",");
});

Deno.test("oauth2: pkce is explicitly disabled — Pinterest documents no code_challenge flow", () => {
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: authorization and token URLs match Pinterest's documented endpoints", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://www.pinterest.com/oauth/");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.pinterest.com/v5/oauth/token");
});
