import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: reports ok with headroom detail when far from the limit", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "ratelimit": '"per-second"; r=9; t=1',
      "ratelimit-policy": '"per-second"; q=10; w=1',
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.message?.includes("9 of 10"), true);
  assertEquals(pathOf(calls[0].url), `/v1${PROBE_PATH}`);
});

Deno.test("quota: reports degraded at or below 20% remaining", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "ratelimit": '"per-second"; r=2; t=1',
      "ratelimit-policy": '"per-second"; q=10; w=1',
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("quota: reports down when remaining is zero", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "ratelimit": '"per-second"; r=0; t=1',
      "ratelimit-policy": '"per-second"; q=10; w=1',
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("quota: reports unknown when the headers are absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: reports unknown on a non-ok probe response", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: is signed, connection-scoped, and informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.severity, "informational");
});
