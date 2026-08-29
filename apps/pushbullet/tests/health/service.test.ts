import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, not probed", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable?.reason && service.unavailable.reason.length > 0);
});

Deno.test("service: is informational — an unavailable check must never pin the verdict at unknown", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("service: cites the unclaimed-Statuspage evidence, not a bare assertion", () => {
  assert(/pushbullet\.statuspage\.io/.test(service.unavailable!.reason));
  assert(/127,696/.test(service.unavailable!.reason));
});
