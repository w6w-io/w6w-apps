import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockKnackCtx } from "../_helpers.ts";

const OBJECT_KEY = "object_1";

Deno.test("quota: reports unknown when the connection records no test Object key", async () => {
  const { ctx } = mockKnackCtx([], {});
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("quota: reports unknown when the response carries none of the documented headers", async () => {
  const { ctx, calls } = mockKnackCtx(
    [{ body: { total_pages: 1, current_page: 1, total_records: 0, records: [] } }],
    { testObject: OBJECT_KEY },
  );
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assertEquals(
    calls[0].url,
    `https://api.knack.com/v1/objects/${OBJECT_KEY}/records?rows_per_page=1`,
  );
});

Deno.test("quota: reads both header pairs when present and reports ok with headroom", async () => {
  const { ctx } = mockKnackCtx(
    [{
      body: { total_pages: 1, current_page: 1, total_records: 0, records: [] },
      headers: {
        "content-type": "application/json",
        "x-planlimit-limit": "10000",
        "x-planlimit-remaining": "9888",
        "x-planlimit-reset": "10738500",
        "x-ratelimit-limit": "10",
        "x-ratelimit-remaining": "9",
        "x-ratelimit-reset": "1534205053",
      },
    }],
    { testObject: OBJECT_KEY },
  );
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "ok");
  const dailyPlan = result.quota?.find((q) => q.id === "daily-plan-limit");
  assertEquals(dailyPlan?.limit, 10000);
  assertEquals(dailyPlan?.remaining, 9888);
  const rate = result.quota?.find((q) => q.id === "per-second-rate-limit");
  assertEquals(rate?.limit, 10);
  assertEquals(rate?.remaining, 9);
  assertEquals(rate?.resetAt, new Date(1534205053 * 1000).toISOString());
});

Deno.test("quota: a daily plan limit at or over 90% reports degraded", async () => {
  const { ctx } = mockKnackCtx(
    [{
      body: {},
      headers: {
        "content-type": "application/json",
        "x-planlimit-limit": "1000",
        "x-planlimit-remaining": "50",
      },
    }],
    { testObject: OBJECT_KEY },
  );
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

Deno.test("quota: a fully exhausted daily plan limit reports down", async () => {
  const { ctx } = mockKnackCtx(
    [{
      body: {},
      headers: {
        "content-type": "application/json",
        "x-planlimit-limit": "1000",
        "x-planlimit-remaining": "0",
      },
    }],
    { testObject: OBJECT_KEY },
  );
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("quota: an exhausted per-second rate limit never outranks degraded", async () => {
  const { ctx } = mockKnackCtx(
    [{
      body: {},
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "10",
        "x-ratelimit-remaining": "0",
      },
    }],
    { testObject: OBJECT_KEY },
  );
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

Deno.test("quota: never reads the credential — the request is signed by the host, not this hook", async () => {
  const src = await Deno.readTextFile(new URL("../../health/quota.ts", import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  // `credential: "signed"` is the declarative HealthCheck posture field, not a
  // read of an actual credential value — the `check` hook's input type carries
  // no credential at all, so what is banned here is a PROPERTY ACCESS or
  // destructure of one, which would only compile if someone widened the hook's
  // own type to smuggle one in.
  if (/\.credential\b/.test(code) || /\bcredential\s*[,}]/.test(code) || /apiKey/i.test(code)) {
    throw new Error("quota check references a credential");
  }
});
