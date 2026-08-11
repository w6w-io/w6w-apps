import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

Deno.test("health/service: a declared absence, informational, with no hook", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  // An `unavailable` entry always reports `unknown`, and `unknown` outranks
  // `ok` in the roll-up — at any other severity this would pin the app's
  // verdict at `unknown` forever.
  assertEquals(service.severity, "informational");
  assert(service.unavailable!.reason.includes("status.fireflies.ai"));
  // No feed can be declared: the Freshstatus tenant behind that hostname does
  // not exist, so there is no incident log to parse.
  assertEquals(service.feed, undefined);
});

Deno.test("health/quota: a declared absence, informational, with no hook", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("rate-limit headers"));
});
