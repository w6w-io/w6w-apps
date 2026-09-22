import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so any severity but `informational` would pin the app at
 * `unknown` forever.
 */
Deno.test("quota: is a declared absence at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.kind, "quota");
  assert((quota.unavailable?.reason ?? "").length > 0);
});

Deno.test("quota: the reason names the header Qualtrics does not send", () => {
  assert(/X-RateLimit/i.test(quota.unavailable?.reason ?? ""), quota.unavailable?.reason);
  assert(/429/.test(quota.unavailable?.reason ?? ""), quota.unavailable?.reason);
});
