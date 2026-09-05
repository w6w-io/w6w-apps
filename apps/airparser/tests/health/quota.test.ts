import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared absence, informational, no check function", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason.length ?? 0) > 0, true);
});
