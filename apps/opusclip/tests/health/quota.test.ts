import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, not a live probe — no readable headroom endpoint exists", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason.length ?? 0) > 0, true);
});

/**
 * Load-bearing: `unavailable` always reports `unknown`, and `unknown`
 * outranks `ok` in the roll-up, so anything but `informational` pins the
 * App's verdict at `unknown` forever.
 */
Deno.test("quota: severity is informational", () => {
  assertEquals(quota.severity, "informational");
});
