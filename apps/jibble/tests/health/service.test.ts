import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, informational, and undeclared as a live check", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(!!service.unavailable?.reason);
  assert(service.unavailable!.reason.includes("404"));
});
