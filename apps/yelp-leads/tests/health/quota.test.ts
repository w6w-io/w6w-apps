import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason.length ?? 0 > 0);
  assertEquals(quota.severity, "informational");
});
