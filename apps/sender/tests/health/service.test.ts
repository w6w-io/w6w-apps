import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable with an informational severity", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals((service.unavailable?.reason.length ?? 0) > 0, true);
});

Deno.test("service: app-scoped, no-credential, kind service", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
});
