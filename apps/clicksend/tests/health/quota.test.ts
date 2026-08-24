import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports ok with plenty of headroom", async () => {
  const { ctx, calls } = mockCtx([
    {
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "6000",
        "x-ratelimit-remaining": "5999",
        "ratelimit-reset": "56",
      },
      body: { http_code: 200, response_code: "SUCCESS", response_msg: "ok", data: {} },
    },
  ]);
  const report = await quota.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 6000);
  assertEquals(report.quota?.[0].remaining, 5999);
  assertEquals(typeof report.quota?.[0].resetAt, "string");
  assertEquals(calls[0].url.endsWith("/subaccount"), true);
});

Deno.test("quota: degrades once remaining drops to the warn threshold", async () => {
  const { ctx } = mockCtx([
    {
      headers: { "x-ratelimit-limit": "100", "x-ratelimit-remaining": "5" },
      body: {},
    },
  ]);
  const report = await quota.check!({} as never, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("5/100"), true);
});

Deno.test("quota: reports down when the window is exhausted", async () => {
  const { ctx } = mockCtx([
    { headers: { "x-ratelimit-limit": "100", "x-ratelimit-remaining": "0" }, body: {} },
  ]);
  const report = await quota.check!({} as never, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: unknown when the headers are absent", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "application/json" }, body: {} }]);
  const report = await quota.check!({} as never, ctx);
  assertEquals(report.state, "unknown");
});
