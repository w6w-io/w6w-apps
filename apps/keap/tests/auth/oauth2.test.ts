import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { faultBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: the two endpoints are Keap's documented ones", () => {
  assertEquals(oauth2.type, "oauth2");
  assertEquals(
    oauth2.oauth2?.authorizationUrl,
    "https://accounts.infusionsoft.com/app/oauth/authorize",
  );
  // Not on the API host's `/crm` prefix: the token endpoint sits at the root.
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.infusionsoft.com/token");
});

Deno.test("oauth2: the only scope Keap documents is `full`", () => {
  assertEquals(oauth2.oauth2?.scopes, ["full"]);
});

/**
 * `pkce` defaults to `true` in @w6w/types, so leaving it unset would send Keap
 * a `code_challenge` that appears in neither its OAuth guide nor either
 * OpenAPI document's `authorizationCode` flow. Setting it explicitly is the
 * decision; this test is what makes changing it deliberate.
 */
Deno.test("oauth2: pkce is set explicitly rather than left to the default", () => {
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: sign stamps the bearer header and returns the request", () => {
  const request = {
    url: "https://api.infusionsoft.com/crm/rest/v2/contacts",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: "tok" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: sign never puts the token in the URL", () => {
  const request = {
    url: "https://api.infusionsoft.com/crm/rest/v2/contacts",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: "tok" } }, mockCtx().ctx) as {
    url: string;
  };
  assert(!signed.url.includes("tok"));
});

Deno.test("oauth2: test refuses a credential with no access token before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await oauth2.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertStringIncludes(out.message!, "accessToken");
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes the identity endpoint with the same header sign builds", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com" } }]);
  assertEquals(await oauth2.test({ credential: { accessToken: "tok" } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/oauth/connect/userinfo");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test classifies a rejected token from the body, not the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: faultBody("keymanagement.service.invalid_access_token", "Invalid Access Token"),
  }]);
  const out = await oauth2.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assertStringIncludes(out.message!, "wrong, expired or has been revoked");
});

Deno.test("oauth2: afterConnect publishes the tenant, which is what tells connections apart", async () => {
  const { ctx } = mockCtx([{
    body: { email: "a@b.com", given_name: "A", family_name: "B", tenant_id: "xy1" },
  }]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(display.tenantId, "xy1");
  assertEquals(display.name, "A B");
});

Deno.test("oauth2: afterConnect makes no request without a token", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await oauth2.afterConnect!({ credential: {} }, ctx), {});
  assertEquals(calls.length, 0);
});

/**
 * The refresh grant authenticates the client with HTTP Basic while the code
 * exchange puts the same pair in the form body, and Keap's refresh tokens
 * rotate. Neither is something the App can implement — it is never handed the
 * client secret — so the App's obligation is to say so where a host integrator
 * will read it. This asserts the statement is still there.
 */
Deno.test("oauth2: the module documents the Basic-auth refresh and rotating refresh tokens", async () => {
  const src = await Deno.readTextFile(new URL("../../auth/oauth2.ts", import.meta.url));
  assertStringIncludes(src, "HTTP Basic");
  assertStringIncludes(src, "Refresh tokens rotate");
  assert(!("refresh" in oauth2), "a refresh hook appeared but the App has no client secret");
});
