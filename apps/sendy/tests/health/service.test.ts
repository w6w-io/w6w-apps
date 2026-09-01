import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, and informational so it never worsens a verdict", () => {
  assertEquals(service.check, undefined);
  assert(
    service.unavailable,
    "service must declare unavailable rather than staying unknown forever",
  );
  assertEquals(service.severity, "informational");
});

Deno.test("service: the reason names the namesake-decoy statuspage, not just 'no page exists'", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("statuspage.io"), reason);
  assert(reason.toLowerCase().includes("self-hosted"), reason);
});
