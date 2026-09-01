import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: a declared absence, not a probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
});

/**
 * `unknown` outranks `ok` in the roll-up, so an `unavailable` check that
 * isn't `informational` would pin the app's overall verdict at `unknown`
 * forever.
 */
Deno.test("quota: informational severity, so it never pins the app's verdict at unknown", () => {
  assertEquals(quota.severity, "informational");
});
