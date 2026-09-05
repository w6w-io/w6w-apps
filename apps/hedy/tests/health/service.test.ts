import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: is a declared absence, not a live probe", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
});

/**
 * `unavailable` always reports `unknown`, and `unknown` outranks `ok` in a
 * roll-up, so anything but `informational` severity would pin the app's
 * health verdict at `unknown` forever.
 */
Deno.test("service: is informational severity", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("service: kind is service", () => {
  assertEquals(service.kind, "service");
});
