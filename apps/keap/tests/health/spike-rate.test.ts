import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import spikeRate from "../../health/spike-rate.ts";

Deno.test("spike-rate: it is a declared absence, not a probe", () => {
  assertEquals(typeof spikeRate.check, "undefined");
  assert(typeof spikeRate.unavailable?.reason === "string");
});

/**
 * Load-bearing. An `unavailable` entry always reports `unknown`, and `unknown`
 * outranks `ok` in the roll-up, so at any other severity this would pin the
 * whole App at `unknown` forever.
 */
Deno.test("spike-rate: the declared absence is informational", () => {
  assertEquals(spikeRate.severity, "informational");
});

Deno.test("spike-rate: the reason quotes the vendor and states both figures", () => {
  const reason = spikeRate.unavailable!.reason;
  assertStringIncludes(reason, "we do not return metrics");
  assertStringIncludes(reason, "25 calls per second");
  assertStringIncludes(reason, "10/second");
});

Deno.test("spike-rate: the reason points at the three windows that ARE readable", () => {
  assertStringIncludes(spikeRate.unavailable!.reason, "`quota` check");
});
