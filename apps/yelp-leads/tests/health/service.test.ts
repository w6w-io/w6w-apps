import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: is a declared absence, informational severity", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable?.reason.length ?? 0 > 0);
  assertEquals(service.severity, "informational");
});

Deno.test("service: covers the whole app", () => {
  assertEquals(service.covers, ["*"]);
});
