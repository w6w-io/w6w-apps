import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("health/quota: declared unavailable, informational so it never pins the App at unknown", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason.length ?? 0) > 0, true);
});
