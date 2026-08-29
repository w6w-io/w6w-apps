import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, informational severity, no check hook", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable!.reason.length ?? 0) > 0, true);
});
