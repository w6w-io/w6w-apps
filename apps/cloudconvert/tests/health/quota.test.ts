import { assertEquals } from "@std/assert";
import quota, { LOW_CREDIT_THRESHOLD, USERS_ME_URL } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: USERS_ME_URL points at the async host", () => {
  assertEquals(USERS_ME_URL, "https://api.cloudconvert.com/v2/users/me");
});

Deno.test("quota: check() reports ok with healthy credits", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { credits: 500 } } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assertEquals(out.quota, [{ id: "credits", remaining: 500, unit: "credits" }]);
});

Deno.test("quota: check() reports degraded below this app's own low-credit buffer", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { credits: LOW_CREDIT_THRESHOLD - 1 } } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("quota: check() reports down at exactly 0 credits", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { credits: 0 } } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("quota: check() reports unknown (not degraded) on a scope-refusal 403", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden.", code: "FORBIDDEN" } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: check() reports unknown when the response carries no numeric credits", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: {} } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: is a connection-scoped, signed check", () => {
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.kind, "quota");
});
