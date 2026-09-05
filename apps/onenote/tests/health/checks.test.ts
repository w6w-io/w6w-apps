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
  // No status host is widened, because no probe reaches one.
  assertEquals(service.network, undefined);
  assertEquals(service.feed, undefined);
});

Deno.test("service: the reason names the surfaces ruled out, and OneNote's two-backend problem", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("ServiceHealth.Read.All"), reason);
  assert(reason.includes("status.cloud.microsoft"), reason);
  assert(reason.includes("status.office365.com"), reason);
  assert(reason.includes("personal"), reason);
  assert(reason.includes("401"), reason);
  assert(reason.includes("301"), reason);
  assert(reason.includes("302"), reason);
});

Deno.test("service: informational, so a permanent `unknown` cannot pin the verdict", () => {
  assertEquals(healthSeverity(service), "informational");
  assertEquals(healthScope(service), "app");
  assertEquals(healthCredential(service), "none");
});

// -------------------------------------------------------------------- quota --

Deno.test("quota: declared absent — OneNote publishes no headroom signal at all", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  const reason = quota.unavailable!.reason;
  assert(reason.includes("120 requests per minute"), reason);
  assert(reason.includes("400 per hour"), reason);
  assert(reason.includes("Retry-After"), reason);
});

Deno.test("quota: informational, like every declared absence", () => {
  assertEquals(healthSeverity(quota), "informational");
});

Deno.test("index/health: only two checks are declared, both absent, plus 1 derived auth check", async () => {
  const app = (await import("../../index.ts")).default;
  assertEquals(app.healthChecks?.map((h: { key: string }) => h.key), ["service", "quota"]);
  assertEquals(
    app.healthChecks?.every((h: { unavailable?: unknown }) => !!h.unavailable),
    true,
  );
  assertEquals(app.auth.map((a: { key: string }) => a.key), ["oauth2"]);
});
