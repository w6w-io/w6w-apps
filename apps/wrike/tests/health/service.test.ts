import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("health/service: declared unavailable and informational", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.unavailable!.reason.length > 0, true);
});
