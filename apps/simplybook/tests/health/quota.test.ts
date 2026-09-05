import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("health/quota: declared unavailable, informational", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason?.length ?? 0) > 0);
  assertEquals(quota.severity, "informational");
});
