import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable (FreeAgent publishes no remaining-quota header)", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason.length && quota.unavailable.reason.length > 0);
});

Deno.test("quota: unavailable checks must be informational, never fatal/degraded", () => {
  assertEquals(quota.severity, "informational");
});
