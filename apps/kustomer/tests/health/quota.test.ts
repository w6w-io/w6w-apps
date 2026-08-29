import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: declares itself informational so it never worsens a roll-up", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: reads limit/remaining off the whoami probe's headers", async () => {
  const { ctx, calls } = mockKustomerCtx([{
    body: { data: { id: "1" } },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "950",
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{ id: "org", limit: 1000, remaining: 950, unit: "requests" }]);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/users/current");
});

Deno.test("quota: degraded under 10% headroom, down at zero", async () => {
  const low = mockKustomerCtx([{
    body: { data: {} },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "50",
    },
  }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const zero = mockKustomerCtx([{
    body: { data: {} },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "0",
    },
  }]);
  assertEquals((await quota.check!({}, zero.ctx)).state, "down");
});

Deno.test("quota: unknown when the connection records no org subdomain", async () => {
  const { ctx } = mockKustomerCtx([], "acme");
  (ctx.connection as { display?: unknown }).display = {};
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: unknown when the probe fails or carries no rate-limit headers", async () => {
  const failed = mockKustomerCtx([{ status: 500, body: {} }]);
  assertEquals((await quota.check!({}, failed.ctx)).state, "unknown");

  const noHeaders = mockKustomerCtx([{ body: { data: {} } }]);
  assertEquals((await quota.check!({}, noHeaders.ctx)).state, "unknown");
});
