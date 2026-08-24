import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("health/service: declares an absence, not a live probe", () => {
  assertEquals(service.check, undefined);
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
});

Deno.test("health/service: severity is informational so an absence never worsens a verdict", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("health/service: kind is service, scoped to the whole app", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
});
