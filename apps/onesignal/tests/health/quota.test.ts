import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, no check hook, informational severity", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason.length ?? 0) > 0, true);
});
