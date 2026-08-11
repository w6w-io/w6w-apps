import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import quota, { canOverage, readDimension, SUBSCRIPTION_URL } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/** A healthy account, in the shape `ExtendedSubscriptionResponseModel` declares. */
function subscription(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tier: "creator",
    status: "active",
    character_count: 17231,
    character_limit: 100000,
    can_extend_character_limit: false,
    max_credit_limit_extension: 0,
    next_character_count_reset_unix: 1738356858,
    voice_slots_used: 1,
    voice_limit: 120,
    voice_add_edit_counter: 12,
    max_voice_add_edits: 230,
    ...over,
  };
}

Deno.test("quota: the check reads the subscription endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: subscription() }]);
  const report = await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/user/subscription");
  assertEquals(SUBSCRIPTION_URL, "https://api.elevenlabs.io/v1/user/subscription");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.map((q) => q.id), ["characters", "voice-slots", "voice-add-edits"]);
});

Deno.test("quota: the character reset time is published as an ISO instant", async () => {
  const { ctx } = mockCtx([{ body: subscription() }]);
  const report = await quota.check!({}, ctx);
  const characters = report.quota?.find((q) => q.id === "characters");
  assertEquals(characters?.limit, 100000);
  assertEquals(characters?.remaining, 100000 - 17231);
  assertEquals(characters?.resetAt, new Date(1738356858 * 1000).toISOString());
});

Deno.test("quota: crossing the warning threshold degrades and names the dimension", async () => {
  const { ctx } = mockCtx([{ body: subscription({ character_count: 95000 }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertStringIncludes(report.message!, "characters at 95000/100000 characters (95%)");
});

/**
 * The overage rule. An account at 100% that CANNOT extend has stopped; one that
 * can keeps generating and is billed. Reporting both as `down` would page
 * someone for a working account.
 */
Deno.test("quota: exhausted characters with no overage entitlement is down", async () => {
  const { ctx } = mockCtx([{ body: subscription({ character_count: 100000 }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: exhausted characters WITH uncapped overage is only degraded", async () => {
  const { ctx } = mockCtx([{
    body: subscription({
      character_count: 100000,
      can_extend_character_limit: true,
      max_credit_limit_extension: "unlimited",
    }),
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertStringIncludes(report.message!, "billed as overage");
});

Deno.test("quota: canOverage needs both the entitlement and a non-zero cap", () => {
  assertEquals(
    canOverage({ can_extend_character_limit: true, max_credit_limit_extension: 500 }),
    true,
  );
  assertEquals(
    canOverage({ can_extend_character_limit: true, max_credit_limit_extension: "unlimited" }),
    true,
  );
  // Entitled but switched off: `0` means usage-based billing is disabled.
  assertEquals(
    canOverage({ can_extend_character_limit: true, max_credit_limit_extension: 0 }),
    false,
  );
  assertEquals(
    canOverage({ can_extend_character_limit: false, max_credit_limit_extension: 500 }),
    false,
  );
});

/** Voice slots are a ceiling you sit at, not an outage. */
Deno.test("quota: an exhausted voice-slot allowance degrades rather than going down", async () => {
  const { ctx } = mockCtx([{ body: subscription({ voice_slots_used: 120 }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertStringIncludes(report.message!, "voice-slots at 120/120");
});

/**
 * The vendor's own schema example carries 212 of 230 voice add/edits used — 92%,
 * which is over the warning threshold. Pinned because it is the realistic case:
 * this dimension is the one most likely to be quietly near its ceiling.
 */
Deno.test("quota: the vendor's own example add/edit figures trip the warning", async () => {
  const { ctx } = mockCtx([{ body: subscription({ voice_add_edit_counter: 212 }) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertStringIncludes(report.message!, "voice-add-edits at 212/230 edits (92%)");
});

Deno.test("quota: a nullable ceiling is skipped rather than read as zero headroom", () => {
  assertEquals(readDimension("voice-add-edits", 5, null, "edits", false), undefined);
  assertEquals(readDimension("voice-add-edits", undefined, 10, "edits", false), undefined);
});

Deno.test("quota: a non-positive ceiling means unmetered, not exhausted", () => {
  const reading = readDimension("characters", 500, 0, "characters", true);
  assertEquals(reading?.state, "ok");
  assertEquals(reading?.quota.limit, 0);
});

Deno.test("quota: remaining never goes negative when billing overshoots the ceiling", () => {
  const reading = readDimension("characters", 100500, 100000, "characters", false);
  assertEquals(reading?.quota.remaining, 0);
});

/** A refusal to answer says nothing about headroom — `unknown`, never `degraded`. */
Deno.test("quota: a scoped key that cannot read the subscription reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: { code: "missing_permissions" } } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message!, "403");
});

Deno.test("quota: a body with no character_limit reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { tier: "creator" } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: the check is signed, connection-scoped and declares no extra egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assert(!quota.network, "a signed check must not widen egress");
});
