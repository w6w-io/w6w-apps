import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return {
    page: { id: "r8kw327v6276", name: "JobNimbus", url: "https://status.jobnimbus.com" },
    components,
    incidents: [],
    scheduled_maintenances: [],
    ...extra,
  };
}

Deno.test("mapComponentStatus: maps the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: reports ok when the Public API component is operational", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "k6l1zkqk6lkp", name: "Login", status: "operational" },
      {
        id: API_COMPONENT_ID,
        name: "Public API - Application Programming Interface",
        status: "operational",
      },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

/**
 * The scenario this check exists for: the page-level indicator can read
 * "minor" from an unrelated component (Web Application Performance) while
 * the Public API itself is fine — verified live 2026-09-01. This app's
 * verdict must track the API component, not the page roll-up.
 */
Deno.test("service: an unrelated degraded component does not affect the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "mqdzsjjl42yx", name: "Web Application Performance", status: "degraded_performance" },
      {
        id: API_COMPONENT_ID,
        name: "Public API - Application Programming Interface",
        status: "operational",
      },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("Web Application Performance"), report.message);
});

Deno.test("service: a degraded Public API component drives the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      {
        id: API_COMPONENT_ID,
        name: "Public API - Application Programming Interface",
        status: "partial_outage",
      },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as JobNimbus reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ id: API_COMPONENT_ID, name: "Public API", status: "operational" }], {
      page: { id: "x", name: "Someone Else", url: "https://status.example.com" },
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: missing the Public API component entirely reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ id: "k6l1zkqk6lkp", name: "Login", status: "operational" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug of the name", () => {
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(
    componentKey({ name: "Public API - Application Programming Interface" }, 0),
    "public-api-application-programming-interface-0",
  );
  assertEquals(componentKey({}, 3), "component-3");
});

Deno.test("service: declares the manifest fields a status check needs", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.jobnimbus.com"]);
});
