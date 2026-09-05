import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

Deno.test("quota: declared as an informational, connection-scoped absence", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
});

/** The reasoning must actually be legible, not a placeholder string. */
Deno.test("quota: the reason names the rate-limits doc, not a made-up header", () => {
  assertEquals(
    quota.unavailable!.reason.includes("docs.goshippo.com/api-concepts/rate-limits"),
    true,
  );
  assertEquals(/PER-MINUTE/.test(quota.unavailable!.reason), true);
});
