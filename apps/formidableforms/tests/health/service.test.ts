import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, informational, no live probe", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason.length ?? 0 > 0);
  assertEquals("check" in service, false);
});
