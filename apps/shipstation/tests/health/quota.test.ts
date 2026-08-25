import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable with informational severity, never check()", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason.length ?? 0 > 0);
});

Deno.test("quota: cites the documented rate limits in its reason", () => {
  assert(quota.unavailable?.reason.includes("200 requests/minute"));
  assert(quota.unavailable?.reason.includes("20/minute"));
});
