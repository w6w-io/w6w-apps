import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, not a live probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.unavailable!.reason.length > 0, true);
});

Deno.test("quota: severity is informational, so it never pins the app's verdict at unknown", () => {
  assertEquals(quota.severity, "informational");
});
