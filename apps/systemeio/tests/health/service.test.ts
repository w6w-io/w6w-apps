import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, informational severity", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable, "expected a declared absence");
  assertEquals(service.severity, "informational");
  assert(service.unavailable.reason.length > 0);
});

Deno.test("service: the reason names the unclaimed-subdomain evidence, not just 'no status page'", () => {
  const reason = service.unavailable!.reason;
  assert(/statuspage\.io/i.test(reason), reason);
  assert(/instatus/i.test(reason), reason);
  assert(/127,696/.test(reason), reason);
});
