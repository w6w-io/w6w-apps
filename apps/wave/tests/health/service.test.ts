import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";

const summary = (indicator: string, components: Array<[string, string, boolean?]> = []) => ({
  page: { name: "Wave", url: "https://status.waveapps.com" },
  status: { indicator, description: indicator === "none" ? "All Systems Operational" : "Incident" },
  components: components.map(([name, status, group]) => ({ name, status, group: group ?? false })),
});

Deno.test("service: unsigned, app-scoped, and reaches only the status host", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.network?.allow, ["status.waveapps.com"]);
  assertEquals(check.credential, undefined);
  assertEquals(check.scope, undefined);
});

Deno.test("service: severity stays at the kind default so a real outage is not hidden", () => {
  assertEquals(check.severity, undefined);
});

Deno.test("service: probes the canonical vendor host, not the unclaimed statuspage.io decoy", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("none") }]);
  await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.waveapps.com/api/v2/summary.json");
  assert(!calls[0].url.includes("wave.statuspage.io"));
});

Deno.test("service: maps the rollup indicator", async () => {
  for (
    const [indicator, state] of [
      ["none", "ok"],
      ["minor", "degraded"],
      ["major", "down"],
      ["critical", "down"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ body: summary(indicator) }]);
    assertEquals((await check.check!({}, ctx)).state, state);
  }
});

Deno.test("service: reports per-component detail and skips group headers", async () => {
  const { ctx } = mockCtx([{
    body: summary("minor", [
      ["Web Application", "operational"],
      ["Invoicing", "degraded_performance"],
      ["Payments", "major_outage"],
      ["Third Party Services", "operational", true],
    ]),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.components, {
    "web-application": { state: "ok" },
    "invoicing": { state: "degraded" },
    "payments": { state: "down" },
  });
  assertEquals(report.components!["third-party-services"], undefined);
});

Deno.test("service: an unknown component vocabulary is `unknown`, not silently ok", async () => {
  const { ctx } = mockCtx([{ body: summary("none", [["Something New", "who_knows"]]) }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.components!["something-new"].state, "unknown");
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("503"));
});

Deno.test("service: a 200 carrying the wrong document is unknown, not ok", async () => {
  // The exact trap: the unclaimed `wave.statuspage.io` decoy also answers 200
  // with a well-formed-looking body, but no real `status.indicator`... in this
  // case we simulate an HTML catch-all / malformed JSON envelope instead.
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no rollup indicator"));
});

Deno.test("service: a non-JSON 200 is unknown rather than a crash", async () => {
  const { ctx } = mockCtx([{
    body: "<!doctype html><html>Statuspage by Atlassian</html>",
    headers: { "content-type": "text/html" },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
