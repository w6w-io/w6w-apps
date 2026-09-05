import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = {
  id: "01KY0BM0EDZQQK0BXQ6XWYAX8A",
  name: "Mercury ",
  url: "https://status.mercury.com/",
};

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: PAGE,
    components: [
      { id: "01KY0CE1ZKFC5GG16WV16YNDJ2", name: "Integrations & API", status: "operational" },
      { id: "01KY0CE1ZKP6CCHSHBRFBSBKXV", name: "Money Movement  ", status: "operational" },
    ],
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
  assertEquals(
    report.components?.["01KY0CE1ZKFC5GG16WV16YNDJ2"],
    { state: "ok", message: "Integrations & API" },
  );
});

Deno.test("service: a page that omits incidents/scheduled_maintenances entirely still reports ok", async () => {
  // Mirrors the real all-clear response observed live 2026-09-05: unlike a
  // classic Statuspage instance, this page's JSON has no `incidents` or
  // `scheduled_maintenances` key at all when there are none.
  const body = summary();
  delete (body as Record<string, unknown>).incidents;
  delete (body as Record<string, unknown>).scheduled_maintenances;
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: an indicator of major reports degraded even if every component looks fine", async () => {
  const { ctx } = mockCtx([{ body: summary({ status: { indicator: "major" } }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
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

Deno.test("service: a non-2xx status page answers unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Mercury's is unknown", async () => {
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
          { id: "01KY0CE1ZKFC5GG16WV16YNDJ2", name: "Integrations & API", status: "operational" },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["01KY0CE1ZKFC5GG16WV16YNDJ2"]);
});

Deno.test("componentKey: falls back to a slug of the name, then a positional key", () => {
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "Integrations & API" }, 3), "integrations-api-3");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: declares kind service, scope app, credential none, and its own network allow", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.mercury.com"]);
});

Deno.test("service: an affected component is named in the message alongside a degraded indicator", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "01KY0CE1ZKP6CCHSHBRFBSBKXV", name: "Money Movement  ", status: "partial_outage" },
        ],
        status: { indicator: "minor", description: "Partial outage: Money Movement" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("Money Movement"), report.message);
});

Deno.test("service: a component alone going bad does NOT flip the verdict — the page's own indicator decides", async () => {
  // Mirrors `wise`'s own test of the same property: the indicator is the
  // verdict, not a fold over component status — see the module doc for the
  // real 2026-09-05 case that motivated this.
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "01KY0CE1ZKP6CCHSHBRFBSBKXV", name: "Money Movement  ", status: "partial_outage" },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});
