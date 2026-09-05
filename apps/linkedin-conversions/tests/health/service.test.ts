import { assert, assertEquals } from "@std/assert";
import service, { STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Shape mirrors the live response measured 2026-09-05. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "mxfydrt8b8xw", name: "LinkedIn API", url: "https://www.linkedin-apistatus.com" },
    components: [],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host, unsigned", () => {
  assertEquals(STATUS_URL, "https://www.linkedin-apistatus.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["www.linkedin-apistatus.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-clear page with zero components reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.components, {});
});

Deno.test("service: an incident maps a degraded component and rolls up to degraded", async () => {
  const body = summary({
    status: { indicator: "minor", description: "Partial degradation" },
    components: [{
      id: "abc123",
      name: "Marketing API",
      status: "degraded_performance",
      group: false,
    }],
  });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["marketing-api"]?.state, "degraded");
});

Deno.test("service: group-container rows are excluded from the component report", async () => {
  const body = summary({
    components: [
      { id: "grp", name: "Storage", status: "operational", group: true },
      { id: "leaf", name: "Dataset", status: "operational", group: false },
    ],
  });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(Object.keys(report.components ?? {}).length, 1);
  assertEquals("grp" in (report.components ?? {}), false);
});

Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: no page-level indicator reports unknown rather than guessing", async () => {
  const body = summary({ status: undefined });
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** Guards against a redirect/rebrand silently pointing this probe at someone else's page. */
Deno.test("service: a page that stops self-identifying as LinkedIn's reports unknown", async () => {
  const body = summary({
    page: { id: "x", name: "Somebody Else", url: "https://status.other.com" },
  });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});
