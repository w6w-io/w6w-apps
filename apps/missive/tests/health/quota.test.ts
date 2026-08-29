import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable, not a live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable?.reason.length && quota.unavailable.reason.length > 0);
});

Deno.test("quota: informational severity, so it can never worsen a roll-up on its own", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: kind is quota, covers everything", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
});
