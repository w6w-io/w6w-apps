import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declares an absence rather than a check", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
});
