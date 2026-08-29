import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, mockGorgiasCtx } from "../_helpers.ts";

Deno.test("quota: is an informational, signed connection check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: unknown when the connection records no domain", async () => {
  const { ctx } = mockCtx();
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: reads used/limit off X-Gorgias-Account-Api-Call-Limit", async () => {
  const { ctx, calls } = mockGorgiasCtx([{
    body: { domain: "acme" },
    headers: {
      "content-type": "application/json",
      "x-gorgias-account-api-call-limit": "10/40",
    },
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/account");
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "bucket", limit: 40, remaining: 30, unit: "requests" }]);
});

Deno.test("quota: degraded under 10% headroom, down at zero", async () => {
  const low = mockGorgiasCtx([{
    body: {},
    headers: { "x-gorgias-account-api-call-limit": "37/40" },
  }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const empty = mockGorgiasCtx([{
    body: {},
    headers: { "x-gorgias-account-api-call-limit": "40/40" },
  }]);
  assertEquals((await quota.check!({}, empty.ctx)).state, "down");
});

Deno.test("quota: unknown when the header is missing or the probe fails", async () => {
  const noHeader = mockGorgiasCtx([{ body: {}, headers: { "content-type": "application/json" } }]);
  assertEquals((await quota.check!({}, noHeader.ctx)).state, "unknown");

  const failed = mockGorgiasCtx([{ status: 401, body: {} }]);
  assertEquals((await quota.check!({}, failed.ctx)).state, "unknown");
});
