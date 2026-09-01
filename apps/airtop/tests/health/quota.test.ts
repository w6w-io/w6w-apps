import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, informational — never a silent unknown", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
});
