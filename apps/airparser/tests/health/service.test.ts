import { assertEquals } from "@std/assert";
import service, {
  mapAggregateState,
  mapResourceStatus,
  resourceKey,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: STATUS_URL is Better Stack's own JSON document, not a Statuspage guess", () => {
  assertEquals(STATUS_URL, "https://status.airparser.com/index.json");
});

Deno.test("mapResourceStatus: maps Better Stack's vocabulary", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("resolved"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("down"), "down");
  assertEquals(mapResourceStatus(undefined), "unknown");
  assertEquals(mapResourceStatus("something-new"), "unknown");
});

Deno.test("mapAggregateState: maps the page-level roll-up", () => {
  assertEquals(mapAggregateState("operational"), "ok");
  assertEquals(mapAggregateState("degraded"), "degraded");
  assertEquals(mapAggregateState("downtime"), "down");
  assertEquals(mapAggregateState(undefined), "unknown");
});

Deno.test("resourceKey: slugifies the public name, falls back to id", () => {
  assertEquals(resourceKey({ attributes: { public_name: "Airparser API" } }, 0), "airparser-api");
  assertEquals(resourceKey({ id: "6394856" }, 0), "6394856");
  assertEquals(resourceKey({}, 3), "resource-3");
});

function page(aggregate: string, resources: Array<{ name: string; status: string }>) {
  return {
    data: {
      type: "status_page",
      attributes: {
        company_name: "Airparser",
        company_url: "https://airparser.com",
        custom_domain: "status.airparser.com",
        aggregate_state: aggregate,
      },
    },
    included: resources.map((r, i) => ({
      id: String(i),
      type: "status_page_resource",
      attributes: { public_name: r.name, status: r.status },
    })),
  };
}

Deno.test("service.check: all-operational reports ok with per-component detail", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page("operational", [
      { name: "Airparser API", status: "operational" },
      { name: "airparser.com", status: "operational" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["airparser-api"].state, "ok");
});

Deno.test("service.check: a degraded component surfaces in the message", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page("degraded", [{ name: "Airparser API", status: "degraded" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("Airparser API (degraded)"), true);
});

Deno.test("service.check: a non-ok status page response is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service.check: an unparseable body is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/html" },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service.check: a page that no longer self-identifies as Airparser is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: {
        type: "status_page",
        attributes: {
          company_name: "SomeOtherVendor",
          company_url: "https://someothervendor.example",
          custom_domain: "status.someothervendor.example",
          aggregate_state: "operational",
        },
      },
      included: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message?.includes("no longer self-identifies"), true);
});

Deno.test("service: credential none, covers *, and its own status-host allowlist", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.covers, ["*"]);
  assertEquals(service.network?.allow, ["status.airparser.com"]);
  assertEquals(service.kind, "service");
});
