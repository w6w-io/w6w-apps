import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: a declared absence, not a probe", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
});

Deno.test("service: informational, so it never pins the App at unknown forever", () => {
  assertEquals(service.severity, "informational");
});
