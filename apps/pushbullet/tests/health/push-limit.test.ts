import { assert, assertEquals } from "@std/assert";
import pushLimit from "../../health/push-limit.ts";

Deno.test("push-limit: declared unavailable, not probed", () => {
  assertEquals(typeof pushLimit.check, "undefined");
  assert(pushLimit.unavailable?.reason && pushLimit.unavailable.reason.length > 0);
});

Deno.test("push-limit: is informational", () => {
  assertEquals(pushLimit.severity, "informational");
});

Deno.test("push-limit: is a distinct question from rate-limit headroom", () => {
  assert(/500/.test(pushLimit.unavailable!.reason));
  assert(/rate-limit/.test(pushLimit.unavailable!.reason));
});
