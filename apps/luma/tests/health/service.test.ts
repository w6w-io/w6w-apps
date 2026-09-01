import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, not a live probe", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.unavailable!.reason.length > 0, true);
});

/**
 * `unknown` outranks `ok` in the roll-up, so at any other severity this
 * absence would pin the app's verdict at `unknown` forever.
 */
Deno.test("service: severity is informational", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("service: reason cites the live-verified 401 'page is inactive' finding", () => {
  assertEquals(service.unavailable!.reason.includes("401"), true);
  assertEquals(service.unavailable!.reason.includes("page is inactive"), true);
});
