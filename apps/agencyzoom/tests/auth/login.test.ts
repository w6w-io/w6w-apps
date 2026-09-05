import { assert, assertEquals } from "@std/assert";
import login from "../../auth/login.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CRED = { username: "owner@agency.example", password: "hunter2", jwt: "jwt.abc.123" };

Deno.test("login: exchange calls POST /auth/login and stores the jwt + credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { jwt: "jwt.abc.123", ownerAgent: true } }]);
  const result = await login.exchange!(
    { fields: { username: CRED.username, password: CRED.password } },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/api/auth/login");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { username: CRED.username, password: CRED.password });
  assertEquals(result, { ...CRED, ownerAgent: true });
});

Deno.test("login: exchange rejects missing username/password without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await login.exchange!({ fields: { username: "", password: "x" } }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});

Deno.test("login: exchange surfaces the vendor's own error message on a bad login", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "Invalid user name or password", fieldErrors: [] },
  }]);
  let message = "";
  try {
    await login.exchange!({ fields: { username: "x", password: "y" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(message.includes("Invalid user name or password"), message);
});

Deno.test("login: sign stamps the bearer header and nothing else, for an ordinary endpoint", () => {
  const request = {
    method: "GET",
    url: "https://api.agencyzoom.com/v1/api/employees",
    headers: {} as Record<string, string>,
  };
  const signed = login.sign!({ request, credential: CRED }, {} as never) as typeof request;

  assertEquals(signed.headers.authorization, `Bearer ${CRED.jwt}`);
  assertEquals(signed.headers["x-api-token"], undefined);
});

/**
 * The one documented quirk this app works around: `policies/create` demands a
 * second header the OpenAPI document never explains the origin of.
 */
Deno.test("login: sign ALSO stamps x-api-token for policies/create, and only for it", () => {
  const request = {
    method: "POST",
    url: "https://api.agencyzoom.com/v1/api/policies/create",
    headers: {} as Record<string, string>,
  };
  const signed = login.sign!({ request, credential: CRED }, {} as never) as typeof request;

  assertEquals(signed.headers.authorization, `Bearer ${CRED.jwt}`);
  assertEquals(signed.headers["x-api-token"], CRED.jwt);
});

Deno.test("login: refresh re-runs the login exchange with the stored password", async () => {
  const { ctx, calls } = mockCtx([{ body: { jwt: "jwt.new.456", ownerAgent: false } }]);
  const result = await login.refresh!({ credential: CRED }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/auth/login");
  assertEquals(JSON.parse(calls[0].body!), { username: CRED.username, password: CRED.password });
  assertEquals(result, { ...CRED, jwt: "jwt.new.456", ownerAgent: false });
});

Deno.test("login: refresh rejects a credential with no stored password", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await login.refresh!({ credential: { jwt: "x" } }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});

Deno.test("login: test passes when GET /employees answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const result = await login.test({ credential: CRED }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/api/employees");
  assertEquals(calls[0].headers.authorization, `Bearer ${CRED.jwt}`);
});

Deno.test("login: test fails without making a request when the credential has no jwt", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await login.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/** Pins the undocumented 401 shape — see lib/client.ts. */
Deno.test("login: test reports a 401 as an expired/revoked session", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      name: "Unauthorized",
      message: "Your request was made with invalid credentials.",
      code: 0,
      status: 401,
    },
  }]);
  const result = await login.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/expired or was revoked/i.test(result.message ?? ""), result.message);
});

Deno.test("login: test reports a non-401 failure via the generic formatter", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await login.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

Deno.test("login: afterConnect returns only what exchange already captured", () => {
  const display = login.afterConnect!({ credential: { ...CRED, ownerAgent: true } }, {} as never);
  assertEquals(display, { username: CRED.username, ownerAgent: true });
});

Deno.test("login: revoke posts to /auth/logout and never throws", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await login.revoke!({ credential: CRED }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/auth/logout");
  assertEquals(calls[0].headers.authorization, `Bearer ${CRED.jwt}`);
});

Deno.test("login: revoke is a no-op without a jwt, and swallows a failed logout call", async () => {
  const { ctx: ctxNoJwt, calls: callsNoJwt } = mockCtx([]);
  await login.revoke!({ credential: {} }, ctxNoJwt);
  assertEquals(callsNoJwt.length, 0);

  const { ctx: ctxFails } = mockCtx([{ status: 500, body: "boom" }]);
  await login.revoke!({ credential: CRED }, ctxFails); // must not throw
});

Deno.test("login: the credential field is declared secret", () => {
  for (const f of login.fields ?? []) {
    if (f.key === "password") assertEquals(f.type, "secret");
  }
});
