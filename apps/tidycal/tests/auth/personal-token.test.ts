import { assert, assertEquals } from "@std/assert";
import personalToken, { authHeaders, PROBE_PATH } from "../../auth/personal-token.ts";
import { mockCtx, pathOf, UNAUTHENTICATED } from "../_helpers.ts";

type Request = { url: string; method: string; headers: Record<string, string> };

const request = (): Request => ({
  url: "https://tidycal.com/api/bookings",
  method: "GET",
  headers: {},
});

Deno.test("personal-token: sign stamps the documented bearer header", () => {
  const signed = personalToken.sign!(
    { request: request(), credential: { token: "tc-abc" } } as never,
    undefined as never,
  ) as Request;
  assertEquals(signed.headers["authorization"], "Bearer tc-abc");
});

/**
 * `sign` is the only hook handed the credential and it runs network-less. A
 * probe that built its own header could drift from what real requests send, so
 * both go through `authHeaders`.
 */
Deno.test("personal-token: sign and the probes share one header builder", () => {
  const signed = personalToken.sign!(
    { request: request(), credential: { token: "tc-abc" } } as never,
    undefined as never,
  ) as Request;
  assertEquals(signed.headers["authorization"], authHeaders({ token: "tc-abc" }).authorization);
});

Deno.test("personal-token: sign does not reach the network", async () => {
  const { ctx, calls } = mockCtx([]);
  personalToken.sign!({ request: request(), credential: { token: "t" } } as never, ctx as never);
  assertEquals(calls.length, 0);
  await Promise.resolve();
});

/** The probe is `/me`: the one response that carries nothing but identity. */
Deno.test("personal-token: test probes GET /api/me with the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "John Doe" } }]);
  const out = await personalToken.test({ credential: { token: "tc-abc" } } as never, ctx);

  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), "/api/me");
  assertEquals(PROBE_PATH, "/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tc-abc");
});

Deno.test("personal-token: a missing token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await personalToken.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * TidyCal answers byte-identically for "no token" and "bad token" (measured), so
 * the message must name both causes instead of claiming one.
 */
Deno.test("personal-token: a 401 names both causes it cannot tell apart", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHENTICATED }]);
  const out = await personalToken.test({ credential: { token: "bad" } } as never, ctx);

  assertEquals(out.ok, false);
  assert(/missing and an invalid token/.test(out.message ?? ""), out.message);
  assert(/paid plan/.test(out.message ?? ""), out.message);
});

Deno.test("personal-token: an unexpected status is reported as itself", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { message: "Server Error" } }]);
  const out = await personalToken.test({ credential: { token: "t" } } as never, ctx);
  assertEquals(out.ok, false);
  assert((out.message ?? "").includes("500"), out.message);
});

/**
 * `afterConnect` keeps three fields and drops four. Narrowing what is *kept* is
 * cheaper to keep correct than auditing what a whole-object copy might one day
 * contain.
 */
Deno.test("personal-token: afterConnect publishes only name, email and vanity path", async () => {
  const { ctx } = mockCtx([{
    body: {
      name: "John Doe",
      email: "john@example.com",
      vanity_path: "johndoe",
      language: "en",
      currency_symbol: "$",
      lifetime_pro_at: "2022-01-01T00:00:00Z",
      profile_picture_url: "https://www.gravatar.com/avatar/abc",
    },
  }]);
  const out = await personalToken.afterConnect!({ credential: { token: "t" } } as never, ctx);
  assertEquals(out, { name: "John Doe", email: "john@example.com", vanityPath: "johndoe" });
});

/** A missing display label must never fail a Connection whose token is live. */
Deno.test("personal-token: afterConnect stays silent when the read fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { message: "Server Error" } }]);
  assertEquals(await personalToken.afterConnect!({ credential: { token: "t" } } as never, ctx), {});
});

Deno.test("personal-token: the credential field is a secret and is the only field", () => {
  assertEquals((personalToken.fields ?? []).map((f) => f.key), ["token"]);
  assertEquals(personalToken.fields?.[0].type, "secret");
  assertEquals(personalToken.fields?.[0].required, true);
});
