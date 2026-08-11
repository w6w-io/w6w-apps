import { assert, assertEquals } from "@std/assert";
import quota, {
  LIMIT_HEADER,
  parseCount,
  PROBE_URL,
  readQuota,
  REMAINING_HEADER,
  THROTTLED_STATUS,
  WARN_FRACTION,
} from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: is a signed, per-connection check that adds no egress host", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined, "a signed check must not widen egress");
  assertEquals(quota.unavailable, undefined, "declared absent — but the headers are readable");
  assertEquals(PROBE_URL, "https://api.podio.com/oauth/scope");
});

/**
 * `x-rate-limit-limit`, not `x-ratelimit-limit`. Podio's own PHP client spells
 * it with the hyphen after `Rate`; almost every other vendor does not. Reading
 * the wrong name yields null, which is indistinguishable from "no quota data".
 */
Deno.test("quota: uses Podio's own hyphenation, not the common X-RateLimit spelling", () => {
  assertEquals(LIMIT_HEADER, "x-rate-limit-limit");
  assertEquals(REMAINING_HEADER, "x-rate-limit-remaining");
  assert(!LIMIT_HEADER.includes("ratelimit"));
});

/**
 * The behavioural half of the same guard. The test above pins the constants; on
 * its own it would move with the code if someone edited both. This serves a
 * response carrying BOTH spellings with different values, so only a lookup on
 * Podio's own hyphenated name produces the right numbers.
 */
Deno.test("quota: reads the hyphenated header when both spellings are present", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      "x-rate-limit-limit": "1000",
      "x-rate-limit-remaining": "900",
      "x-ratelimit-limit": "5",
      "x-ratelimit-remaining": "1",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota, [{ id: "requests", limit: 1000, remaining: 900, unit: "requests" }]);
  assertEquals(report.state, "ok", "read the X-RateLimit spelling and saw a near-exhausted quota");
});

/** Podio throttles with 420, from its client's status switch. Not 429. */
Deno.test("quota: the throttled status is 420", () => {
  assertEquals(THROTTLED_STATUS, 420);
});

Deno.test("quota: reads the two headers off the scope response", async () => {
  const { ctx, calls } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      [LIMIT_HEADER]: "1000",
      [REMAINING_HEADER]: "742",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "requests", limit: 1000, remaining: 742, unit: "requests" }]);
  assertEquals(pathOf(calls[0].url), "/oauth/scope");
});

/**
 * The rule that keeps this check honest: absent headers report `unknown`, never
 * `ok`. A quota check that reads "fine" because it found nothing is worse than
 * one that admits it found nothing.
 */
Deno.test("quota: absent headers report unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("not evidence of headroom"));
  assertEquals(report.quota, undefined);
});

Deno.test("quota: a live 420 is reported as an active throttle with zero remaining", async () => {
  const { ctx } = mockCtx([{ status: THROTTLED_STATUS, body: { error: "rate_limit" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("throttled right now"));
  assertEquals(report.quota, [{ id: "requests", remaining: 0, unit: "requests" }]);
});

Deno.test("quota: an auth failure says nothing about headroom, so it is unknown", async () => {
  for (const status of [401, 403, 500]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const report = await quota.check!({}, ctx);
    assertEquals(report.state, "unknown", `status ${status}`);
    assert(report.message!.includes(String(status)));
  }
});

// --- the arithmetic ----------------------------------------------------------

Deno.test("readQuota: both headers absent is unknown with a reason", () => {
  const out = readQuota(undefined, undefined);
  assertEquals(out.state, "unknown");
  assert(out.message!.includes(LIMIT_HEADER));
  assert(out.message!.includes(REMAINING_HEADER));
});

Deno.test("readQuota: a limit without a remaining is unknown but still reports the ceiling", () => {
  const out = readQuota(1000, undefined);
  assertEquals(out.state, "unknown");
  assertEquals(out.quota, [{ id: "requests", limit: 1000, unit: "requests" }]);
});

Deno.test("readQuota: a remaining without a limit is still a usable reading", () => {
  const out = readQuota(undefined, 50);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{ id: "requests", remaining: 50, unit: "requests" }]);
});

Deno.test("readQuota: zero remaining is down and names the 420 status", () => {
  const out = readQuota(1000, 0);
  assertEquals(out.state, "down");
  assert(out.message!.includes("exhausted"));
  assert(out.message!.includes("420"));
  assert(out.message!.includes("not 429"));
});

Deno.test("readQuota: the warning threshold is a tenth of the ceiling, inclusive", () => {
  assertEquals(WARN_FRACTION, 0.1);
  assertEquals(readQuota(1000, 100).state, "degraded", "exactly at the threshold must warn");
  assertEquals(readQuota(1000, 101).state, "ok");
  assertEquals(readQuota(1000, 1).state, "degraded");
  assert(readQuota(1000, 100).message!.includes("100 of 1000"));
});

Deno.test("readQuota: a non-positive ceiling never triggers the fraction warning", () => {
  assertEquals(readQuota(0, 5).state, "ok");
});

Deno.test("parseCount: accepts only a plain non-negative integer", () => {
  assertEquals(parseCount("742"), 742);
  assertEquals(parseCount(" 742 "), 742);
  assertEquals(parseCount("0"), 0);
  assertEquals(parseCount(null), undefined);
  assertEquals(parseCount(""), undefined);
  assertEquals(parseCount("-1"), undefined);
  assertEquals(parseCount("1.5"), undefined);
  assertEquals(parseCount("many"), undefined);
});
