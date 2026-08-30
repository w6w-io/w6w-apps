import { assert, assertEquals } from "@std/assert";
import { healthCredential, healthScope, healthSeverity } from "@w6w/types";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import requestRate from "../../health/request-rate.ts";
import { mockCtx } from "../_helpers.ts";

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

Deno.test("service: the reason names the surfaces that were ruled out, with what they answered", () => {
  const reason = service.unavailable!.reason;
  assert(reason.includes("ServiceHealth.Read.All"), reason);
  assert(reason.includes("status.cloud.microsoft"), reason);
  assert(reason.includes("status.office365.com"), reason);
  assert(reason.includes("portal.office.com"), reason);
  assert(reason.includes("401"), reason);
  assert(reason.includes("301"), reason);
  assert(reason.includes("302"), reason);
  assert(reason.includes("2,058-byte"), reason);
});

Deno.test("service: informational, so a permanent `unknown` cannot pin the verdict", () => {
  assertEquals(healthSeverity(service), "informational");
  assertEquals(healthScope(service), "app");
  assertEquals(healthCredential(service), "none");
});

// ------------------------------------------------------------- request-rate --

Deno.test("request-rate: declared absent, because SharePoint publishes no RateLimit headers", () => {
  assertEquals(requestRate.kind, "quota");
  assertEquals(requestRate.check, undefined);
  const reason = requestRate.unavailable!.reason;
  assert(reason.includes("does not return or support IETF RateLimit headers"), reason);
  assert(reason.includes("Retry-After"), reason);
  assert(reason.includes("1,250 RU/min"), reason);
});

Deno.test("request-rate: informational, like every declared absence", () => {
  assertEquals(healthSeverity(requestRate), "informational");
});

// -------------------------------------------------------------------- quota --

Deno.test("quota: is a real probe against the root site's default library", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(typeof quota.check, "function");
  assertEquals(quota.unavailable, undefined);
});

Deno.test("quota: signed posture, so it declares no egress widening of its own", () => {
  assertEquals(healthCredential(quota), "signed");
  assertEquals(healthScope(quota), "connection");
  assertEquals(healthSeverity(quota), "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: probes GET /sites/root/drive — the connection's default, config-free resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { quota: { state: "normal" } } }]);
  await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://graph.microsoft.com/v1.0/sites/root/drive");
  assertEquals(calls[0].method, "GET");
});

Deno.test("quota: reads the vendor's own state rather than re-deriving one", async () => {
  const { ctx } = mockCtx([{
    body: { quota: { total: 1000, used: 200, remaining: 800, deleted: 5, state: "normal" } },
  }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0], { id: "storage", limit: 1000, remaining: 800, unit: "bytes" });
});

Deno.test("quota: `nearing` and `critical` are degraded, `exceeded` is down", async () => {
  for (
    const [state, expected] of [["nearing", "degraded"], ["critical", "degraded"], [
      "exceeded",
      "down",
    ]] as const
  ) {
    const { ctx } = mockCtx([{ body: { quota: { total: 100, remaining: 1, state } } }]);
    assertEquals((await quota.check!({} as never, ctx)).state, expected, state);
  }
});

Deno.test("quota: falls back to the byte counts when a library reports no state", async () => {
  // A document library on an unlimited tenant plan does this.
  const { ctx } = mockCtx([{ body: { quota: { total: 1000, remaining: 50 } } }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "degraded");
  assert(out.message?.includes("no storage state"), out.message);
});

Deno.test("quota: a full library with no state is down", async () => {
  const { ctx } = mockCtx([{ body: { quota: { total: 1000, remaining: 0 } } }]);
  assertEquals((await quota.check!({} as never, ctx)).state, "down");
});

Deno.test("quota: an unrecognised vendor state falls through to the counts", async () => {
  const { ctx } = mockCtx([{ body: { quota: { total: 1000, remaining: 900, state: "martian" } } }]);
  assertEquals((await quota.check!({} as never, ctx)).state, "ok");
});

Deno.test("quota: no quota facet at all is unknown, not a verdict", async () => {
  const { ctx } = mockCtx([{ body: { id: "d1" } }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("quota"), out.message);
});

Deno.test("quota: a 429 answers the question rather than giving up on it", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: {},
    headers: { "content-type": "application/json", "retry-after": "31" },
  }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "down");
  assert(out.message?.includes("31"), out.message);
});

Deno.test("quota: any other failure is unknown, not a verdict", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const out = await quota.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("503"), out.message);
});
