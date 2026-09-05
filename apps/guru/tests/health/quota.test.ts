import { assertEquals, assertExists } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, no check hook", () => {
  assertEquals(quota.check, undefined);
  assertExists(quota.unavailable);
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
});
