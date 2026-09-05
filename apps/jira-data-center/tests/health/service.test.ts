import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable and informational — self-hosted software has no vendor status", () => {
  assertEquals(service.check, undefined);
  assert((service.unavailable?.reason.length ?? 0) > 0);
  assertEquals(service.severity, "informational");
});
