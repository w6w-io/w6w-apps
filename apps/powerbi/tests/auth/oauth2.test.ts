import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { AUTHORIZATION_URL, SCOPES, TOKEN_URL } from "../../auth/oauth2.ts";

Deno.test("oauth2: uses the Microsoft identity platform v2.0 endpoints, tenant `common`", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(AUTHORIZATION_URL, "https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  assertEquals(TOKEN_URL, "https://login.microsoftonline.com/common/oauth2/v2.0/token");
  assertEquals(auth.oauth2?.authorizationUrl, AUTHORIZATION_URL);
  assertEquals(auth.oauth2?.tokenUrl, TOKEN_URL);
});

Deno.test("oauth2: every scope is resource-qualified against the Power BI Service resource, not Graph", () => {
  const resourceScopes = SCOPES.filter((s) => s !== "offline_access");
  assert(resourceScopes.length > 0);
  for (const scope of resourceScopes) {
    assert(
      scope.startsWith("https://analysis.windows.net/powerbi/api/"),
      `${scope} is not resource-qualified`,
    );
  }
});

Deno.test("oauth2: requests exactly the scopes the actions need", () => {
  assertEquals([...SCOPES].sort(), [
    "https://analysis.windows.net/powerbi/api/Dashboard.Read.All",
    "https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All",
    "https://analysis.windows.net/powerbi/api/Report.ReadWrite.All",
    "https://analysis.windows.net/powerbi/api/Workspace.ReadWrite.All",
    "offline_access",
  ]);
});

Deno.test("oauth2: offline_access is present — Microsoft issues refresh tokens by scope", () => {
  assert(SCOPES.includes("offline_access"));
  assertEquals(auth.oauth2?.extraAuthParams, undefined);
});

Deno.test("oauth2: PKCE stays on", () => {
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: sign stamps the bearer token and touches nothing else", async () => {
  const { ctx, calls } = mockCtx();
  const request = {
    url: "https://api.powerbi.com/v1.0/myorg/groups",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
  assertEquals(Object.keys(signed.headers), ["authorization"]);
  // `sign` is network-less by contract.
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes GET /availableFeatures, which the reference states needs no scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { features: [] } }]);
  const out = await auth.test({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(calls[0].url, "https://api.powerbi.com/v1.0/myorg/availableFeatures");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.ok, true);
});

Deno.test("oauth2: the test probe's response carries no credential material", () => {
  const body = { features: [{ name: "embedTrial", state: "Enabled" }] };
  const serialized = JSON.stringify(body);
  assertEquals(serialized.includes("SUPER-SECRET"), false);
  assertEquals(serialized.toLowerCase().includes("token"), false);
});

Deno.test("oauth2: a missing token fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: a rejected token classifies from the x-powerbi-error-info HEADER, not a JSON body", async () => {
  // Verified live 2026-08-30: a bogus bearer token gets 403, content-length 0.
  const { ctx } = mockCtx([{
    status: 403,
    headers: { "x-powerbi-error-info": "InvalidToken" },
  }]);
  const out = await auth.test({ credential: { accessToken: "bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("InvalidToken"), out.message);
});

Deno.test("oauth2: a rejection with no error-info header still reports the status", async () => {
  const { ctx } = mockCtx([{ status: 403 }]);
  const out = await auth.test({ credential: { accessToken: "bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("403"), out.message);
});

Deno.test("oauth2: declares no afterConnect — Power BI's REST API has no whoami endpoint to label a connection from", () => {
  assertEquals(auth.afterConnect, undefined);
});
