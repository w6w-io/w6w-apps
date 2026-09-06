import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, informational severity", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(service.unavailable, "service must declare `unavailable`");
  assert(service.unavailable!.reason.length > 0);
});
