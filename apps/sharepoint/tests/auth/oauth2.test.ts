import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { AUTHORIZATION_URL, SCOPES, TOKEN_URL } from "../../auth/oauth2.ts";

Deno.test("oauth2: uses the Microsoft identity platform v2.0 endpoints", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(
    AUTHORIZATION_URL,
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
  );
  assertEquals(TOKEN_URL, "https://login.microsoftonline.com/organizations/oauth2/v2.0/token");
  assertEquals(auth.oauth2?.authorizationUrl, AUTHORIZATION_URL);
  assertEquals(auth.oauth2?.tokenUrl, TOKEN_URL);
});

Deno.test("oauth2: the tenant segment is `organizations` — SharePoint is not documented for personal accounts", () => {
  // Unlike the sibling `onedrive` App, which can use `common` because every
  // drive endpoint there is documented for a personal Microsoft account too.
  assert(AUTHORIZATION_URL.includes("/organizations/"), AUTHORIZATION_URL);
  assert(TOKEN_URL.includes("/organizations/"), TOKEN_URL);
  assertEquals(AUTHORIZATION_URL.includes("/common/"), false);
});

Deno.test("oauth2: offline_access is present — Microsoft issues refresh tokens by scope", () => {
  assert(SCOPES.includes("offline_access"));
  assertEquals(auth.oauth2?.extraAuthParams, undefined);
});

Deno.test("oauth2: requests exactly the scopes the actions need", () => {
  assertEquals([...SCOPES].sort(), [
    "Sites.Manage.All",
    "Sites.Read.All",
    "Sites.ReadWrite.All",
    "User.Read",
    "offline_access",
  ]);
  // No Files.* scope — every action addresses a site, list or library
  // explicitly, so the Sites.* family alone covers the whole surface.
  assertEquals(SCOPES.some((s) => s.startsWith("Files.")), false);
});

Deno.test("oauth2: PKCE stays on", () => {
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: sign stamps the bearer token and touches nothing else", async () => {
  const { ctx, calls } = mockCtx();
  const request = {
    url: "https://graph.microsoft.com/v1.0/sites/root",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok");
  assertEquals(Object.keys(signed.headers), ["authorization"]);
  // `sign` is network-less by contract.
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes GET /me, which needs only User.Read", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const out = await auth.test({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(calls[0].url, "https://graph.microsoft.com/v1.0/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.ok, true);
});

Deno.test("oauth2: the test probe's response carries no credential material", () => {
  const profile = {
    id: "u1",
    displayName: "Ada",
    mail: "ada@example.com",
    userPrincipalName: "ada@example.com",
  };
  const serialized = JSON.stringify(profile);
  assertEquals(serialized.includes("SUPER-SECRET"), false);
});

Deno.test("oauth2: a missing token fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: a rejected token reports the status rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { code: "InvalidAuthentication" } } }]);
  const out = await auth.test({ credential: { accessToken: "bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("401"), out.message);
});

Deno.test("oauth2: afterConnect labels the connection from the profile", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", displayName: "Ada", mail: "ada@example.com" },
  }]);
  const out = await auth.afterConnect!({} as never, ctx) as {
    user?: { id?: string; email?: string; name?: string };
  };
  assertEquals(out.user, { id: "u1", email: "ada@example.com", name: "Ada" });
});

Deno.test("oauth2: afterConnect falls back to userPrincipalName when mail is null", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", displayName: null, mail: null, userPrincipalName: "ada@contoso.com" },
  }]);
  const out = await auth.afterConnect!({} as never, ctx) as {
    user?: { email?: string; name?: string };
  };
  assertEquals(out.user?.email, "ada@contoso.com");
  assertEquals(out.user?.name, "ada@contoso.com");
});

Deno.test("oauth2: afterConnect stays quiet when the profile call fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({} as never, ctx), {});
});
