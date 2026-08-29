import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so any severity but `informational` would pin the app at
 * `unknown` forever.
 */
Deno.test("service: is a declared absence at informational severity", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.check, "undefined");
  assert((service.unavailable?.reason ?? "").length > 0);
  assert(
    /status\.openrouter\.ai/.test(service.unavailable?.reason ?? ""),
    "the reason should name the surface that was checked and found unusable",
  );
});
