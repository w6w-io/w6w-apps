import { assertEquals, assertStringIncludes } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import oauth2Password from "../../auth/oauth2-password.ts";
import { hostOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("exchange: mints a token via grant_type=password with HTTP Basic", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { access_token: "tok-1", refresh_token: "ref-1", expires_in: 3600 } },
  ]);
  const credential = await oauth2Password.exchange!({
    fields: {
      apiHost: "api.signnow.com",
      clientId: "client-1",
      clientSecret: "secret-1",
      username: "a@b.com",
      password: "pw",
    },
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0]), "/oauth2/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("client-1:secret-1")}`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("grant_type"), "password");
  assertEquals(form.get("username"), "a@b.com");
  assertEquals(form.get("password"), "pw");

  assertEquals(credential.accessToken, "tok-1");
  assertEquals(credential.refreshToken, "ref-1");
  assertEquals(credential.apiHost, "api.signnow.com");
});

Deno.test("exchange: throws with SignNow's own error when the token request fails", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "invalid_client" } }]);
  let threw = false;
  try {
    await oauth2Password.exchange!({
      fields: {
        apiHost: "api.signnow.com",
        clientId: "bad",
        clientSecret: "bad",
        username: "a@b.com",
        password: "wrong",
      },
    }, ctx);
  } catch (err) {
    threw = true;
    assertStringIncludes((err as Error).message, "invalid_client");
  }
  assertEquals(threw, true);
});

Deno.test("exchange: rejects missing fields before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await oauth2Password.exchange!({ fields: { apiHost: "api.signnow.com" } }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("refresh: renews via grant_type=refresh_token, keeping the old refresh token if none reissued", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { access_token: "tok-2" } }]);
  const credential = await oauth2Password.refresh!({
    credential: {
      apiHost: "api.signnow.com",
      clientId: "client-1",
      clientSecret: "secret-1",
      accessToken: "tok-1",
      refreshToken: "ref-1",
    },
  }, ctx) as Record<string, unknown>;

  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("grant_type"), "refresh_token");
  assertEquals(form.get("refresh_token"), "ref-1");
  assertEquals(credential.accessToken, "tok-2");
  assertEquals(credential.refreshToken, "ref-1");
});

Deno.test("refresh: throws when the connection has no refresh token", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await oauth2Password.refresh!({
      credential: {
        apiHost: "api.signnow.com",
        clientId: "client-1",
        clientSecret: "secret-1",
        accessToken: "tok-1",
      },
    }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("sign: stamps a Bearer authorization header", () => {
  const request: SignableRequest = {
    url: "https://api.signnow.com/user",
    method: "GET",
    headers: {},
  };
  const signed = oauth2Password.sign!(
    { request, credential: { accessToken: "tok-1" } },
    mockCtx().ctx,
  ) as SignableRequest;
  assertEquals(signed.headers["authorization"], "Bearer tok-1");
});

Deno.test("test: ok when GET /user succeeds", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user-1" } }]);
  const result = await oauth2Password.test(
    { credential: { apiHost: "api.signnow.com", accessToken: "tok-1" } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0]), "/user");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-1");
});

Deno.test("test: never calls GET /oauth2/token — that endpoint echoes the caller's own token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user-1" } }]);
  await oauth2Password.test(
    { credential: { apiHost: "api.signnow.com", accessToken: "tok-1" } },
    ctx,
  );
  for (const call of calls) {
    assertEquals(pathOf(call).includes("oauth2/token"), false);
  }
});

Deno.test("test: classifies failure from the response body's `error`, not the (400) status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "invalid_token", code: 1537 } }]);
  const result = await oauth2Password.test(
    { credential: { apiHost: "api.signnow.com", accessToken: "bogus" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assertStringIncludes(result.message ?? "", "invalid_token");
});

Deno.test("test: fails locally when the credential has no accessToken, without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2Password.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records apiHost and the account's own profile fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { id: "user-1", primary_email: "a@b.com", first_name: "A", last_name: "B" },
    },
  ]);
  const display = await oauth2Password.afterConnect!({
    credential: { apiHost: "api-eval.signnow.com", accessToken: "tok-1" },
  }, ctx);
  assertEquals(display.apiHost, "api-eval.signnow.com");
  assertEquals(display.userId, "user-1");
  assertEquals(display.email, "a@b.com");
  assertEquals(display.name, "A B");
  assertEquals(hostOf(calls[0]), "api-eval.signnow.com");
});

Deno.test("afterConnect: does not fail the connection when the profile read fails", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "invalid_token" } }]);
  const display = await oauth2Password.afterConnect!({
    credential: { apiHost: "api.signnow.com", accessToken: "bogus" },
  }, ctx);
  assertEquals(display.apiHost, "api.signnow.com");
  assertEquals(display.userId, undefined);
});

Deno.test("exchange: apiHost select controls which host is used", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { access_token: "tok-1" } }]);
  await oauth2Password.exchange!({
    fields: {
      apiHost: "api-eval.signnow.com",
      clientId: "c",
      clientSecret: "s",
      username: "a@b.com",
      password: "pw",
    },
  }, ctx);
  assertEquals(hostOf(calls[0]), "api-eval.signnow.com");
  assertEquals(queryOf(calls[0]).toString(), "");
});
