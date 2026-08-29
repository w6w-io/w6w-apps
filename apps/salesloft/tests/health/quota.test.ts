import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: informational, signed, no network.allow of its own", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: reads x-ratelimit-remaining-minute off GET /v2/me", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: 1 } },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-remaining-minute": "580",
      "x-ratelimit-endpoint-cost": "1",
    },
  }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://api.salesloft.com/v2/me");
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0].remaining, 580);
});

Deno.test("quota: zero remaining reports down", async () => {
  const { ctx } = mockCtx([{
    body: { data: {} },
    headers: { "content-type": "application/json", "x-ratelimit-remaining-minute": "0" },
  }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "down");
});

Deno.test("quota: no rate-limit header reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: a failing probe reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid token" } }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
});
