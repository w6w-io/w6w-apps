import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable with informational severity", () => {
  assertEquals(quota.unavailable !== undefined, true);
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
});
