import { assertEquals, assertExists } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, no check hook", () => {
  assertEquals(service.check, undefined);
  assertExists(service.unavailable);
  assertEquals(service.severity, "informational");
  assertEquals(service.kind, "service");
});
