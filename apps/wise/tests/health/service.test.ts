import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = { id: "hg7qg2qssg6b", name: "Wise", url: "https://status.wise.com" };

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: PAGE,
    components: [
      { id: "bmfb24t34ymm", name: "🔗 API", status: "operational", group: false },
      { id: "2jxb8y760wrd", name: "💸 Payments", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("service: fetches the documented status URL", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: all-operational + indicator none reports ok, keyed by component id", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.components?.["bmfb24t34ymm"], { state: "ok", message: "🔗 API" });
});

Deno.test("service: the page-level indicator is the verdict, not the worst component", async () => {
  // Mirrors the real incident observed live 2026-09-05: an open incident whose
  // affected_components had already both stepped back to operational, while
  // the page-level indicator (the field this check trusts) reads "none".
  const { ctx } = mockCtx([
    {
      body: summary({
        incidents: [{ name: "Delayed AED payments", status: "identified" }],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("1 open incident"), report.message);
});

Deno.test("service: a degraded component maps through mapComponentStatus and mapIndicator", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: an indicator of major reports degraded even if every component looks fine", async () => {
  const { ctx } = mockCtx([{ body: summary({ status: { indicator: "major" } }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: a non-2xx status page answers unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Wise's is unknown", async () => {
  const { ctx } = mockCtx([
    { body: summary({ page: { ...PAGE, url: "https://status.example.com" } }) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: group container rows are excluded from the component report", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "grp1", name: "Storage", status: "operational", group: true },
          { id: "bmfb24t34ymm", name: "🔗 API", status: "operational", group: false },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["bmfb24t34ymm"]);
});

Deno.test("componentKey: falls back to a slug of the name, then a positional key", () => {
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "🔗 API" }, 3), "api-3");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: declares kind service, scope app, credential none, and its own network allow", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.wise.com"]);
});
