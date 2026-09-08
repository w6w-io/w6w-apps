import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, informational, and undeclared as a live check", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(!!quota.unavailable?.reason);
  assert(quota.unavailable!.reason.includes("X-Rate-Limit"));
});
