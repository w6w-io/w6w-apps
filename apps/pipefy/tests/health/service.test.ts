import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";

const summary = (
  indicator: string,
  components: Array<[string, string, boolean?]> = [["API (GraphQL)", "operational"]],
) => ({
  page: { name: "Pipefy", url: "https://status.pipefy.com/" },
  status: { indicator, description: indicator === "none" ? "All Systems Operational" : "Incident" },
  components: components.map(([name, status, group]) => ({ name, status, group: group ?? false })),
});

Deno.test("service: unsigned, app-scoped, and reaches only the status host", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.network?.allow, ["status.pipefy.com"]);
  assertEquals(check.credential, undefined);
  assertEquals(check.scope, undefined);
});

Deno.test("service: severity stays at the kind default so a real outage is not hidden", () => {
  assertEquals(check.severity, undefined);
});

Deno.test("service: probes the canonical vendor host, not the inactive statuspage.io decoy", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("none") }]);
  await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.pipefy.com/api/v2/summary.json");
  assert(!calls[0].url.includes("pipefy.statuspage.io"));
});

Deno.test("service: anchors on the API (GraphQL) component, not the page rollup", async () => {
  const { ctx } = mockCtx([{
    body: summary("minor", [
      ["API (GraphQL)", "operational"],
      ["Billing", "major_outage"],
    ]),
  }]);
  const report = await check.check!({}, ctx);
  // Page rollup says "minor"/degraded, but the API component itself is fine.
  assertEquals(report.state, "ok");
});

Deno.test("service: maps the component vocabulary", async () => {
  for (
    const [status, state] of [
      ["operational", "ok"],
      ["degraded_performance", "degraded"],
      ["partial_outage", "degraded"],
      ["major_outage", "down"],
      ["under_maintenance", "degraded"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ body: summary("none", [["API (GraphQL)", status]]) }]);
    assertEquals((await check.check!({}, ctx)).state, state);
  }
});

Deno.test("service: an unknown component status is `unknown`, not silently ok", async () => {
  const { ctx } = mockCtx([{ body: summary("none", [["API (GraphQL)", "who_knows"]]) }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a vanished/renamed component falls back to the page rollup, not `unknown` forever", async () => {
  const { ctx } = mockCtx([{ body: summary("major", [["Something Else", "operational"]]) }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("API (GraphQL)"));
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("503"));
});

Deno.test("service: a 200 carrying the wrong document is unknown, not ok", async () => {
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
