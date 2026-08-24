import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declares an app-scoped, informational, declared-absent check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  // Declared absence, not a probe: no `check` hook and a stated `reason`.
  assertEquals(service.check, undefined);
  assert(typeof service.unavailable?.reason === "string" && service.unavailable.reason.length > 0);
});

Deno.test("service: the reason names the decoy, so a reader knows what was actually checked", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("2019"), "should cite the frozen timestamp finding");
  assert(/status\.io|Operational/i.test(reason), "should describe why the feed is not a signal");
});
