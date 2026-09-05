import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable and informational — Data Center publishes no rate-limit headers", () => {
  assertEquals(quota.check, undefined);
  assert((quota.unavailable?.reason.length ?? 0) > 0);
  assertEquals(quota.severity, "informational");
});
