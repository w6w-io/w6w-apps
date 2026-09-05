import { assert, assertEquals } from "@std/assert";
import login from "../../auth/login.ts";
import { mockCtx, pathOf, TEST_API_BASE } from "../_helpers.ts";

const CRED = {
  apiBase: TEST_API_BASE,
  company: "acme",
  token: "tok_abc123",
  refreshToken: "rtok_xyz789",
};

Deno.test("login: exchange calls POST /admin/auth and stores the token pair", async () => {
  const { ctx, calls } = mockCtx([
    { body: { token: "tok_abc123", company: "acme", refresh_token: "rtok_xyz789" } },
  ]);
  const result = await login.exchange!(
    { fields: { company: "acme", login: "owner@acme.example", password: "hunter2" } },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/admin/auth");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    company: "acme",
    login: "owner@acme.example",
    password: "hunter2",
  });
  assertEquals(result, CRED);
});

Deno.test("login: exchange defaults apiBase and validates a custom one", async () => {
  const { ctx: ctxDefault } = mockCtx([{ body: { token: "t", company: "acme" } }]);
  const result = await login.exchange!(
    { fields: { company: "acme", login: "x", password: "y" } },
    ctxDefault,
  ) as typeof CRED;
  assertEquals(result.apiBase, TEST_API_BASE);

  let threw = false;
  try {
    await login.exchange!(
      { fields: { company: "acme", login: "x", password: "y", apiBase: "https://evil.example" } },
      mockCtx([]).ctx,
    );
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("login: exchange rejects missing fields without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await login.exchange!({ fields: { company: "", login: "x", password: "y" } }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});

Deno.test("login: exchange surfaces the vendor's own error message on a bad company", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: 400, message: "Invalid company", data: [], message_data: [] },
  }]);
  let message = "";
  try {
    await login.exchange!({ fields: { company: "nope", login: "x", password: "y" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(message.includes("Invalid company"), message);
});

Deno.test("login: exchange fails loudly on require2fa instead of storing an empty token", async () => {
  const { ctx } = mockCtx([{
    body: { token: "", refresh_token: "", require2fa: true, allowed2faproviders: ["sms"] },
  }]);
  let message = "";
  try {
    await login.exchange!({ fields: { company: "acme", login: "x", password: "y" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/two-factor/i.test(message), message);
});

Deno.test("login: sign stamps X-Company-Login and X-Token", () => {
  const request = {
    method: "GET",
    url: `${TEST_API_BASE}/admin/services`,
    headers: {} as Record<string, string>,
  };
  const signed = login.sign!({ request, credential: CRED }, {} as never) as typeof request;

  assertEquals(signed.headers["x-company-login"], CRED.company);
  assertEquals(signed.headers["x-token"], CRED.token);
});

Deno.test("login: refresh calls POST /admin/auth/refresh-token and returns a new token", async () => {
  const { ctx, calls } = mockCtx([
    { body: { token: "tok_new456", company: "acme", refresh_token: "rtok_new999" } },
  ]);
  const result = await login.refresh!({ credential: CRED }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/auth/refresh-token");
  assertEquals(JSON.parse(calls[0].body!), { company: "acme", refresh_token: CRED.refreshToken });
  assertEquals(result, { ...CRED, token: "tok_new456", refreshToken: "rtok_new999" });
});

Deno.test("login: refresh rejects a credential with no refresh token", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await login.refresh!({ credential: { ...CRED, refreshToken: undefined } }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});

Deno.test("login: test passes when GET /admin/services answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const result = await login.test({ credential: CRED }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/admin/services");
  assertEquals(calls[0].headers["x-company-login"], CRED.company);
  assertEquals(calls[0].headers["x-token"], CRED.token);
});

Deno.test("login: test fails without a request when the credential is incomplete", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await login.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/** Pins the 419 "Token Expired" quirk — see lib/client.ts. */
Deno.test("login: test reports 419 as an expired token, distinct from a generic failure", async () => {
  const { ctx } = mockCtx([{ status: 419, statusText: "Token Expired" }]);
  const result = await login.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/expired or/i.test(result.message ?? ""), result.message);
});

Deno.test("login: test reports 401/403 the same way as 419", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status }]);
    const result = await login.test({ credential: CRED }, ctx);
    assertEquals(result.ok, false);
    assert(/expired or/i.test(result.message ?? ""), result.message);
  }
});

Deno.test("login: test reports a non-auth failure via the generic formatter", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await login.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

Deno.test("login: afterConnect echoes apiBase and company for actions to read", () => {
  const display = login.afterConnect!({ credential: CRED }, {} as never);
  assertEquals(display, { apiBase: CRED.apiBase, company: CRED.company });
});

Deno.test("login: revoke posts to /admin/auth/logout and never throws", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await login.revoke!({ credential: CRED }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/auth/logout");
  assertEquals(calls[0].headers["x-token"], CRED.token);
  assertEquals(JSON.parse(calls[0].body!), { auth_token: CRED.token });
});

Deno.test("login: revoke is a no-op without a token, and swallows a failed logout call", async () => {
  const { ctx: ctxNoToken, calls: callsNoToken } = mockCtx([]);
  await login.revoke!({ credential: {} }, ctxNoToken);
  assertEquals(callsNoToken.length, 0);

  const { ctx: ctxFails } = mockCtx([{ status: 500, body: "boom" }]);
  await login.revoke!({ credential: CRED }, ctxFails); // must not throw
});

Deno.test("login: the password field is declared secret", () => {
  for (const f of login.fields ?? []) {
    if (f.key === "password") assertEquals(f.type, "secret");
  }
});
