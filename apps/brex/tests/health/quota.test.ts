import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * Brex documents its rate limits in prose and signals them only with a `429`;
 * two live responses measured 2026-09-22 carried no rate-limit header at all.
 * So this check is a declared ABSENCE, and the assertions below are about that
 * declaration being a usable one rather than a silent gap.
 */
Deno.test("quota: declared absent, with no hook to run", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
});

/**
 * Load-bearing. An `unavailable` entry always reports `unknown`, and `unknown`
 * outranks `ok` in the roll-up, so at any other severity this declaration would
 * pin the App's verdict at `unknown` forever.
 */
Deno.test("quota: the declared absence is informational", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: the reason names the evidence, not just the conclusion", () => {
  const reason = quota.unavailable?.reason ?? "";
  // The ceilings Brex does document.
  assert(/1,000 requests per 60 seconds/.test(reason), reason);
  // The signal, which arrives after the fact.
  assert(/429/.test(reason), reason);
  // The headers that do not exist.
  assert(/X-RateLimit-\*/.test(reason), reason);
  assert(/Retry-After/.test(reason), reason);
  // And where that was established.
  assert(/api\.brex\.com/.test(reason), reason);
});

Deno.test("quota: the check claims no egress and no credential", () => {
  assertEquals(quota.network, undefined);
  assertEquals(quota.credential, undefined);
});
