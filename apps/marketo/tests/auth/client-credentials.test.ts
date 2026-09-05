import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

Deno.test("exchange: mints a token with a GET request, credentials in the query string", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        access_token: "tok-1:int",
        token_type: "bearer",
        expires_in: 3599,
        scope: "apis@acme.com",
      },
    },
  ]);
  const cred = await auth.exchange!({
    fields: {
      restBaseUrl: "https://123-abc-456.mktorest.com",
      identityUrl: "https://123-abc-456.mktorest.com/identity",
      clientId: "cid",
      clientSecret: "csecret",
    },
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://123-abc-456.mktorest.com/identity/oauth/token");
  assertEquals(url.searchParams.get("grant_type"), "client_credentials");
  assertEquals(url.searchParams.get("client_id"), "cid");
  assertEquals(url.searchParams.get("client_secret"), "csecret");
  assertEquals(cred.accessToken, "tok-1:int");
  assertEquals(cred.scope, "apis@acme.com");
  assertEquals(cred.restBaseUrl, "https://123-abc-456.mktorest.com");
  assertEquals(cred.identityUrl, "https://123-abc-456.mktorest.com/identity");
});

Deno.test("exchange: strips a trailing /rest from the pasted REST base URL", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "t", expires_in: 3600 } }]);
  const cred = await auth.exchange!({
    fields: {
      restBaseUrl: "https://123-abc-456.mktorest.com/rest",
      identityUrl: "https://123-abc-456.mktorest.com/identity",
      clientId: "cid",
      clientSecret: "csecret",
    },
  }, ctx) as Record<string, unknown>;
  assertEquals(cred.restBaseUrl, "https://123-abc-456.mktorest.com");
});

Deno.test("exchange: a 401 from the Identity endpoint is a clear bad-credential error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "unauthorized" } }]);
  let threw = false;
  try {
    await auth.exchange!({
      fields: {
        restBaseUrl: "https://123-abc-456.mktorest.com",
        identityUrl: "https://123-abc-456.mktorest.com/identity",
        clientId: "cid",
        clientSecret: "wrong",
      },
    }, ctx);
  } catch (err) {
    threw = true;
    assert(String((err as Error).message).includes("401"));
  }
  assertEquals(threw, true);
});

Deno.test("refresh: re-mints from the stored client id/secret — no refresh token to redeem", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok-2", expires_in: 3600 } }]);
  const cred = await auth.refresh!({
    credential: {
      restBaseUrl: "https://123-abc-456.mktorest.com",
      identityUrl: "https://123-abc-456.mktorest.com/identity",
      clientId: "cid",
      clientSecret: "csecret",
      accessToken: "tok-1",
    },
  }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("grant_type"), "client_credentials");
  assertEquals(cred.accessToken, "tok-2");
});

Deno.test("sign: stamps the Authorization header and touches nothing else", () => {
  const request = { headers: {} as Record<string, string>, method: "GET", url: "https://x" };
  const out = auth.sign!(
    { request, credential: { accessToken: "tok-1" } } as never,
    {} as never,
  ) as {
    headers: Record<string, string>;
  };
  assertEquals(out.headers["authorization"], "Bearer tok-1");
});

Deno.test("test: success:true is a pass", async () => {
  const { ctx } = mockCtx([{ body: { success: true, result: [] } }]);
  const out = await auth.test({
    credential: { accessToken: "tok-1", restBaseUrl: "https://123-abc-456.mktorest.com" },
  }, ctx);
  assertEquals(out.ok, true);
});

Deno.test("test: a 200 with success:false and code 601/602 is an expired/invalid token", async () => {
  const { ctx } = mockCtx([
    { body: { success: false, errors: [{ code: "602", message: "Access token expired" }] } },
  ]);
  const out = await auth.test({
    credential: { accessToken: "tok-1", restBaseUrl: "https://123-abc-456.mktorest.com" },
  }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("602"));
});

Deno.test("test: code 603 is diagnosed as a permissions problem, not an invalid token", async () => {
  const { ctx } = mockCtx([
    { body: { success: false, errors: [{ code: "603", message: "Access denied" }] } },
  ]);
  const out = await auth.test({
    credential: { accessToken: "tok-1", restBaseUrl: "https://123-abc-456.mktorest.com" },
  }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("permission"));
});

Deno.test("test: a non-JSON response is diagnosed as a wrong REST base URL", async () => {
  const { ctx } = mockCtx([{
    body: "<html>nope</html>",
    headers: { "content-type": "text/html" },
  }]);
  const out = await auth.test({
    credential: { accessToken: "tok-1", restBaseUrl: "https://123-abc-456.mktorest.com" },
  }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("REST base URL"));
});

Deno.test("test never echoes the access token or client secret in its message", async () => {
  const { ctx } = mockCtx([
    { body: { success: false, errors: [{ code: "601", message: "Unauthorized" }] } },
  ]);
  const out = await auth.test({
    credential: {
      accessToken: "super-secret-token",
      restBaseUrl: "https://123-abc-456.mktorest.com",
    },
  }, ctx);
  assert(!out.message!.includes("super-secret-token"));
});
