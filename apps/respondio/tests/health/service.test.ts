import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: is declared unavailable, not a probing check", () => {
  assertEquals(typeof service.check, "undefined");
  assert(typeof service.unavailable?.reason === "string" && service.unavailable.reason.length > 0);
});

/**
 * An `unavailable` entry always reports `unknown`, which outranks `ok` in a
 * roll-up — at any severity but `informational` this would pin the App's
 * verdict at `unknown` forever.
 */
Deno.test("service: is informational, so a declared absence never pins the app at unknown", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("service: is a service-kind check covering the whole app", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
});
