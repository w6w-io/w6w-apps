import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: is a declared absence, at informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.length ?? 0 > 0);
});

Deno.test("quota: names the documented ceiling and the lack of a header", () => {
  const reason = quota.unavailable?.reason ?? "";
  assert(/600/.test(reason), reason);
  assert(/X-RateLimit/i.test(reason), reason);
});
