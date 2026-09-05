import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("health/service: declared unavailable, informational", () => {
  assertEquals(service.kind, "service");
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason?.length ?? 0) > 0);
  assertEquals(service.severity, "informational");
});
