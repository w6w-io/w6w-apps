import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, not a probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
});

/**
 * `unavailable` always reports `unknown`, which outranks `ok` in the roll-up
 * — so at any severity but `informational` this would pin the App's verdict
 * at `unknown` forever.
 */
Deno.test("quota: severity is informational", () => {
  assertEquals(quota.severity, "informational");
});
