import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: is a declared absence, not a live probe", () => {
  assertEquals(typeof service.check, "undefined");
  assert(typeof service.unavailable?.reason === "string" && service.unavailable.reason.length > 0);
});

/**
 * `unknown` outranks `ok` in a health roll-up, so anything other than
 * `informational` would pin this app's verdict at `unknown` forever — the
 * exact failure mode `HEALTHCHECKS.md` warns about for a declared absence.
 */
Deno.test("service: severity is informational", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("service: is unsigned, matching a service-kind check with no credential", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});
