import { assert, assertEquals } from "@std/assert";
import rateLimit from "../../health/rate-limit.ts";

Deno.test("rate-limit: declared unavailable, informational severity", () => {
  assertEquals(typeof rateLimit.check, "undefined");
  assert(rateLimit.unavailable?.reason.length ?? 0 > 0);
  assertEquals(rateLimit.severity, "informational");
});
