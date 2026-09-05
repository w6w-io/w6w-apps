import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals((quota.unavailable?.reason?.length ?? 0) > 0, true);
  assertEquals(quota.severity, "informational");
});
