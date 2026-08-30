import { assert, assertEquals } from "@std/assert";
import { healthCredential, healthScope, healthSeverity } from "@w6w/types";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

// ------------------------------------------------------------------ service --

Deno.test("service: is declared absent rather than backed by a guessed probe", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assert(service.unavailable?.reason, "must record why no probe exists");
  assertEquals(service.check, undefined);
  assertEquals(service.network, undefined);
  assertEquals(service.feed, undefined);
});

Deno.test("service: the reason names both status.cloud.microsoft AND the azure.status.microsoft trap", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("status.cloud.microsoft"), reason);
  assert(reason.includes("2,058-byte"), reason);
  assert(reason.includes("ServiceHealth.Read.All"), reason);
  assert(reason.includes("Power BI Embedded"), reason);
  assert(reason.includes("category"), reason);
});

Deno.test("service: informational, so a permanent `unknown` cannot pin the verdict", () => {
  assertEquals(healthSeverity(service), "informational");
  assertEquals(healthScope(service), "app");
  assertEquals(healthCredential(service), "none");
});

// -------------------------------------------------------------------- quota --

Deno.test("quota: declared absent, because Power BI publishes no rate-limit headers", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  const reason = quota.unavailable!.reason;
  assert(reason.includes("429"), reason);
  assert(reason.includes("Retry-After"), reason);
  assert(reason.includes("8 dataset-refresh"), reason);
  assert(reason.includes("120 DAX"), reason);
});

Deno.test("quota: informational, like every declared absence", () => {
  assertEquals(healthSeverity(quota), "informational");
});
