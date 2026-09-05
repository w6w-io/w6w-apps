import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, informational, no live probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.length ?? 0 > 0);
  assertEquals("check" in quota, false);
});
