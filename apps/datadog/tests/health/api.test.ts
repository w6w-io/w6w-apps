import { assert, assertEquals } from "@std/assert";
import api, { REACHABILITY_PATH } from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { EU1, mockCtx, US1 } from "../_helpers.ts";

Deno.test("api: it is per-connection, unsigned, and needs no extra egress", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "connection");
  assertEquals(api.credential, "context");
  // Every api.<site> host is already in the app's own allowlist.
  assertEquals(api.network, undefined);
});

Deno.test("api: it probes this connection's own site", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { errors: ["Forbidden"] } }], "eu1");
  await api.check!({}, ctx);
  assertEquals(calls[0].url, `${EU1}${REACHABILITY_PATH}`);
  // Unsigned: the probe must carry no credential of any kind.
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept"]);
});

/**
 * The point of the check. A schema-correct auth refusal proves the host
 * resolves, terminates TLS and is Datadog. Datadog answers 403 here and 401
 * elsewhere, so both are accepted — pinning one would break the day Datadog
 * made them consistent.
 */
Deno.test("api: a 403 to an unsigned probe is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: ["Forbidden"] } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("Forbidden"), report.message);
  assert(report.message?.includes("api.datadoghq.com"), report.message);
});

Deno.test("api: a 401 to an unsigned probe is equally a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized"] } }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
});

/**
 * The right status with the wrong body: a captive portal or TLS-inspecting
 * proxy answering for this host. It is not evidence Datadog is down, so it is
 * `unknown`.
 */
Deno.test("api: a 403 that is not in Datadog's error format reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "<html>Access denied by proxy</html>" }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("proxy"), report.message);
});

/** Datadog never validates an unsigned request, so a 200 means it is not Datadog. */
Deno.test("api: a 200 to an unsigned probe is suspicious, not healthy", async () => {
  const { ctx } = mockCtx([{ body: { valid: true } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("never does"), report.message);
});

Deno.test("api: being rate-limited still proves the site is up", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { errors: ["Too many requests"] } }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
});

Deno.test("api: a 5xx is the one case this check may call down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: an unexpected status reports unknown rather than guessing", async () => {
  const { ctx } = mockCtx([{ status: 302, body: "" }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("302"), report.message);
});

Deno.test("api: a transport failure is a genuine outage for this host", async () => {
  // mockCtx throws on an unqueued fetch, which is exactly a transport failure.
  const { ctx } = mockCtx([]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("unreachable"), report.message);
});

/**
 * UK1 has no status page, so this check is its only automatable signal. It must
 * work there identically.
 */
Deno.test("api: it works on UK1, the site with no status page", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { errors: ["Forbidden"] } }], "uk1");
  const report = await api.check!({}, ctx);
  assertEquals(calls[0].url, `https://api.uk1.datadoghq.com${REACHABILITY_PATH}`);
  assertEquals(report.state, "ok");
});

Deno.test("api: the default site is probed when a connection carries none", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { errors: ["Forbidden"] } }], "us1");
  await api.check!({}, ctx);
  assertEquals(calls[0].url, `${US1}${REACHABILITY_PATH}`);
});

// --- the declared absence ----------------------------------------------------

Deno.test("quota: it is a declared absence, informational, with a reason that names the evidence", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable?.reason ?? "";
  assert(reason.includes("X-RateLimit"), reason);
  assert(reason.includes("no aggregate quota endpoint"), reason);
  // The reason must point at the path that IS reachable, not just say no.
  assert(reason.includes("datadog.apis.usage"), reason);
  assert(reason.includes("metric-query"), reason);
});
