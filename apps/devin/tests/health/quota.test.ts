import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared unavailable at informational severity, not left to default to unknown forever", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason && quota.unavailable.reason.length > 0);
});

Deno.test("quota: the reason names both the request-rate and ACU findings", () => {
  const reason = quota.unavailable!.reason;
  assert(/rate/i.test(reason));
  assert(/ACU|Enterprise plan/i.test(reason));
});
