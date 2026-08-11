import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * A declared absence, not a gap: Motion sends no `X-RateLimit-*` header, no
 * `Retry-After` and publishes no consumption endpoint, so there is nothing to
 * probe. Spending the quota to measure it would cost 8% of an individual plan's
 * minute per check.
 */
Deno.test("quota: is a declared absence with no probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
});

/**
 * `informational` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
Deno.test("quota: is informational, or it would pin the app at unknown", () => {
  assertEquals(quota.severity, "informational");
});

/** The ceilings a workflow author needs are in the reason, not only in a doc page. */
Deno.test("quota: the reason quotes the tier ceilings that do exist", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("12 requests/minute"), reason);
  assert(reason.includes("120/minute"), reason);
  assert(/X-RateLimit/i.test(reason), reason);
});
