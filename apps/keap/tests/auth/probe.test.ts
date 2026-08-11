import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fetchUserInfo, PROBE_PATH, probeCredential } from "../../auth/probe.ts";
import { faultBody, mockCtx, pathOf } from "../_helpers.ts";

const USER_INFO = {
  email: "jo@example.com",
  sub: "12345",
  id: "123456",
  keap_id: "jo@example.com",
  given_name: "Jo",
  family_name: "Smith",
  is_admin: true,
  tenant_id: "ab103",
};

Deno.test("probe: the path is the identity endpoint, not a data read", () => {
  assertEquals(PROBE_PATH, "/rest/v2/oauth/connect/userinfo");
});

Deno.test("probe: a 200 is a pass", async () => {
  const { ctx, calls } = mockCtx([{ body: USER_INFO }]);
  assertEquals(await probeCredential({ authorization: "Bearer t" }, ctx, "Keap"), { ok: true });
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/oauth/connect/userinfo");
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

/**
 * The whole reason this probe classifies from the body. Both of the next two
 * are HTTP 401 and byte-identical at the status line; they need different
 * fixes.
 */
Deno.test("probe: oauth.v2.InvalidAccessToken reports that NO credential arrived", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: faultBody("oauth.v2.InvalidAccessToken", "Invalid access token"),
  }]);
  const out = await probeCredential({}, ctx, "Keap");
  assertEquals(out.ok, false);
  assertStringIncludes(out.message!, "no usable credential");
  assertStringIncludes(out.message!, "upstream of the token");
  // And specifically NOT the "your token is wrong" wording.
  assert(!/wrong, expired or has been revoked/.test(out.message!));
});

Deno.test("probe: keymanagement.service.* reports that the credential WAS rejected", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: faultBody("keymanagement.service.invalid_access_token", "Invalid Access Token"),
  }]);
  const out = await probeCredential({ authorization: "Bearer garbage" }, ctx, "Keap");
  assertEquals(out.ok, false);
  assertStringIncludes(out.message!, "wrong, expired or has been revoked");
  assert(!/no usable credential/.test(out.message!));
});

Deno.test("probe: the two 401s produce different messages from the same status code", async () => {
  const { ctx: a } = mockCtx([{
    status: 401,
    body: faultBody("oauth.v2.InvalidAccessToken", "Invalid access token"),
  }]);
  const { ctx: b } = mockCtx([{
    status: 401,
    body: faultBody("keymanagement.service.invalid_access_token", "Invalid Access Token"),
  }]);
  const first = await probeCredential({}, a, "Keap");
  const second = await probeCredential({ authorization: "Bearer x" }, b, "Keap");
  assert(
    first.message !== second.message,
    "the two 401 causes collapsed into one message — the status code was read instead of the body",
  );
});

Deno.test("probe: a 403 says the credential is recognised but refused", async () => {
  const { ctx } = mockCtx([{ status: 403, body: faultBody("access.denied", "Forbidden") }]);
  const out = await probeCredential({ authorization: "Bearer t" }, ctx, "Keap");
  assertEquals(out.ok, false);
  assertStringIncludes(out.message!, "recognised but not permitted");
});

Deno.test("probe: a 429 fails loudly and says it proves nothing about the credential", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: faultBody("policies.ratelimit.QuotaViolation", "Rate limit exceeded"),
  }]);
  const out = await probeCredential({ authorization: "Bearer t" }, ctx, "Keap");
  assertEquals(out.ok, false);
  assertStringIncludes(out.message!, "not a statement about the credential");
});

Deno.test("probe: an unrecognised failure still reports the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  const out = await probeCredential({ authorization: "Bearer t" }, ctx, "Keap");
  assertEquals(out.ok, false);
  assertStringIncludes(out.message!, "HTTP 500");
});

// --- afterConnect -----------------------------------------------------------

Deno.test("fetchUserInfo publishes identity and nothing else", async () => {
  const { ctx } = mockCtx([{ body: USER_INFO }]);
  const display = await fetchUserInfo({ authorization: "Bearer t" }, ctx);
  assertEquals(display, {
    email: "jo@example.com",
    name: "Jo Smith",
    tenantId: "ab103",
    userId: "123456",
    isAdmin: true,
  });
});

Deno.test("fetchUserInfo never republishes the credential it was handed", async () => {
  const { ctx } = mockCtx([{ body: { ...USER_INFO, keap_id: "jo@example.com" } }]);
  const display = await fetchUserInfo({ authorization: "Bearer super-secret-token" }, ctx);
  const serialised = JSON.stringify(display);
  assert(!serialised.includes("super-secret-token"), "the credential leaked into the display data");
  assert(!/authorization/i.test(serialised));
});

Deno.test("fetchUserInfo falls back to the preferred name, then the email", async () => {
  const { ctx } = mockCtx([{ body: { email: "x@y.com", preferred_name: "Jojo" } }]);
  assertEquals((await fetchUserInfo({}, ctx)).name, "Jojo");
  const { ctx: bare } = mockCtx([{ body: { email: "x@y.com" } }]);
  assertEquals((await fetchUserInfo({}, bare)).name, "x@y.com");
});

Deno.test("fetchUserInfo is silent on failure — a missing label must not break a connection", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals(await fetchUserInfo({ authorization: "Bearer t" }, ctx), {});
});
