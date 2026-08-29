import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared as an unavailable, informational-severity check", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals((quota.unavailable?.reason.length ?? 0) > 0, true);
});

Deno.test("quota: explains BOTH unreadable dimensions (balance and rate-limit headroom)", () => {
  const reason = quota.unavailable?.reason ?? "";
  assertEquals(reason.toLowerCase().includes("balance"), true);
  assertEquals(reason.toLowerCase().includes("rate-limit"), true);
});
