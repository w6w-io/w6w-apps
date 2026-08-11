import { assert, assertEquals } from "@std/assert";
import quota, { QUOTA_URL, readRateLimit, WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";
import type { HealthQuota, HealthReport } from "@w6w/types";

function userBody(used: number, size: number) {
  return { result: true, user: { files: { used, size, lastCheckPoint: "2026-08-01T00:00:00Z" } } };
}

const find = (report: HealthReport, id: string): HealthQuota | undefined =>
  report.quota?.find((q) => q.id === id);

Deno.test("quota: reads the same /user endpoint as the credential probe", async () => {
  const { ctx, calls } = mockCtx([{ body: userBody(1, 100) }]);
  await quota.check!({}, ctx);

  assertEquals(calls[0].url, QUOTA_URL);
  assertEquals(QUOTA_URL, "https://api.raindrop.io/rest/v1/user");
});

/**
 * The vendor's own table spells the middle header **without** the `X-` prefix
 * (`RateLimit-Remaining`) while its 429 example prints `X-RateLimit-Remaining`.
 * Both are read rather than picking one and being wrong half the time.
 */
Deno.test("quota: accepts both documented spellings of the remaining header", () => {
  const vendorTable = readRateLimit(
    new Headers({ "X-RateLimit-Limit": "120", "RateLimit-Remaining": "119" }),
  );
  const vendorExample = readRateLimit(
    new Headers({ "X-RateLimit-Limit": "120", "X-RateLimit-Remaining": "119" }),
  );

  assertEquals(vendorTable.limit, 120);
  assertEquals(vendorTable.remaining, 119);
  assertEquals(vendorExample.remaining, 119);
});

/**
 * `X-RateLimit-Reset` is documented as **UTC epoch seconds**. Reading it as
 * milliseconds would put every reset in January 1970 and make `resetAt` quietly
 * useless — the vendor's own example value is the one used here.
 */
Deno.test("quota: the reset header is seconds, not milliseconds", () => {
  const reading = readRateLimit(new Headers({ "X-RateLimit-Reset": "1392321600" }));
  assertEquals(reading.resetAt, new Date(1392321600 * 1000).toISOString());
  assertEquals(reading.resetAt, "2014-02-13T20:00:00.000Z");
});

Deno.test("quota: absent or unparseable headers produce no reading, not a zero", () => {
  assertEquals(readRateLimit(new Headers()), {});
  assertEquals(readRateLimit(new Headers({ "X-RateLimit-Limit": "" })), {});
  assertEquals(readRateLimit(new Headers({ "X-RateLimit-Limit": "lots" })), {});
});

Deno.test("quota: a healthy account reports both dimensions as ok", async () => {
  const { ctx } = mockCtx([{
    body: userBody(1_000_000, 10_000_000_000),
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "120",
      "ratelimit-remaining": "119",
    },
  }]);
  const report = await quota.check!({}, ctx) as HealthReport;

  assertEquals(report.state, "ok");
  assertEquals(find(report, "requests-per-minute"), {
    id: "requests-per-minute",
    unit: "requests",
    limit: 120,
    remaining: 119,
  });
  // 10,000,000,000 published minus the 1,000,000 consumed.
  assertEquals(find(report, "file-storage")?.remaining, 9_999_000_000);
  assertEquals(find(report, "file-storage")?.limit, 10_000_000_000);
});

/**
 * The headers could not be verified at build time — the limit is documented as
 * per *authenticated* user and no Raindrop credential was available — so their
 * absence must be reported as an absence, never fabricated and never silently
 * treated as healthy.
 */
Deno.test("quota: missing rate-limit headers are stated, not fabricated", async () => {
  const { ctx } = mockCtx([{ body: userBody(1, 100) }]);
  const report = await quota.check!({}, ctx) as HealthReport;

  assertEquals(find(report, "requests-per-minute"), undefined);
  assert(/no rate-limit headers/i.test(report.message ?? ""), report.message);
  // The file allowance is still readable, so the check is not `unknown`.
  assertEquals(report.state, "ok");
});

Deno.test("quota: a nearly-full file allowance is degraded, a full one is down", async () => {
  const warn = mockCtx([{ body: userBody(95, 100) }]);
  const full = mockCtx([{ body: userBody(100, 100) }]);

  assertEquals(WARN_FRACTION, 0.9);
  assertEquals((await quota.check!({}, warn.ctx) as HealthReport).state, "degraded");
  assertEquals((await quota.check!({}, full.ctx) as HealthReport).state, "down");
});

/**
 * The rate window is one minute wide and recovers on its own, so an exhausted
 * request budget is a queue, not an outage — never worse than `degraded`.
 */
Deno.test("quota: an exhausted request budget is degraded, never down", async () => {
  const { ctx } = mockCtx([{
    body: userBody(1, 100),
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "120",
      "ratelimit-remaining": "0",
    },
  }]);
  const report = await quota.check!({}, ctx) as HealthReport;

  assertEquals(report.state, "degraded");
  assert(/0\/120 requests/.test(report.message ?? ""), report.message);
});

/**
 * A missing or non-positive allowance is "not published", not "exhausted".
 * Reading it the other way would report a whole class of accounts as full.
 */
Deno.test("quota: a zero file allowance is skipped rather than scored as full", async () => {
  const { ctx } = mockCtx([{ body: userBody(0, 0) }]);
  const report = await quota.check!({}, ctx) as HealthReport;

  assertEquals(find(report, "file-storage"), undefined);
  // Nothing readable at all — so `unknown`, not a confident `ok`.
  assertEquals(report.state, "unknown");
});

/** Failing to read a quota is not evidence of a low quota. */
Deno.test("quota: a non-2xx and a result:false body both report unknown", async () => {
  const failed = mockCtx([{ status: 500, body: "" }]);
  const flagged = mockCtx([{ body: { result: false, errorMessage: "nope" } }]);

  assertEquals((await quota.check!({}, failed.ctx) as HealthReport).state, "unknown");
  assertEquals((await quota.check!({}, flagged.ctx) as HealthReport).state, "unknown");
});

Deno.test("quota: is a signed, per-connection check that widens no egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined);
});
