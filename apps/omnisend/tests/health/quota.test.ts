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
  assert((quota.unavailable?.reason ?? "").length > 0);
  assert(
    /X-RateLimit-Remaining/i.test(quota.unavailable?.reason ?? ""),
    "the reason should name the header Omnisend does not send",
  );
});

Deno.test("quota: covers everything, since no dimension is readable", () => {
  assertEquals(quota.covers, ["*"]);
});
