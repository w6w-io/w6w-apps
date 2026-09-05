import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("health/service: declares an absence rather than a probe", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in a roll-up — at any severity but `informational` this would pin the
 * App at `unknown` forever.
 */
Deno.test("health/service: is informational, not the kind: service default of degraded", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("health/service: covers the whole app", () => {
  assertEquals(service.covers, ["*"]);
});
