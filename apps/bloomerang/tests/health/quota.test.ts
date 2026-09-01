import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared absent — no check hook, informational, and a stated reason", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
});

Deno.test("quota: declares no egress — nothing is ever fetched for it", () => {
  assertEquals(quota.network, undefined);
});
