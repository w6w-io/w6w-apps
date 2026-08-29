import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable rather than probed", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
});

Deno.test("quota: is informational — an unavailable quota check must not pin the app at unknown", () => {
  assertEquals(quota.severity, "informational");
});
