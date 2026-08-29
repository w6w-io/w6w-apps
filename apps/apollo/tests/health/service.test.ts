import { assert, assertEquals } from "@std/assert";
import service, { componentKey, mapResourceStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: reads status.apollo.io/index.json, unsigned, informational severity", () => {
  assertEquals(STATUS_URL, "https://status.apollo.io/index.json");
  assertEquals(service.credential, "none");
  assertEquals(service.severity, "informational");
});

Deno.test("mapResourceStatus: Better Stack's documented vocabulary", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus(undefined), "unknown");
  assertEquals(mapResourceStatus("something-new"), "unknown");
});

Deno.test("componentKey: slugifies a monitor's public name", () => {
  assertEquals(componentKey("app.apollo.io"), "app-apollo-io");
  assertEquals(componentKey("Background Jobs Latency"), "background-jobs-latency");
});

function page(
  resources: Array<{ public_name: string; status: string }>,
  aggregate = "operational",
) {
  return {
    data: {
      attributes: {
        company_name: "Apollo",
        company_url: "https://www.apollo.io",
        custom_domain: "status.apollo.io",
        aggregate_state: aggregate,
      },
    },
    included: resources.map((r) => ({
      type: "status_page_resource",
      attributes: { public_name: r.public_name, status: r.status },
    })),
  };
}

Deno.test("service: all-operational relevant monitors report ok", async () => {
  const { ctx } = mockCtx([
    {
      body: page([
        { public_name: "app.apollo.io", status: "operational" },
        { public_name: "Background Jobs Latency", status: "operational" },
        { public_name: "Payment Gateway", status: "downtime" }, // irrelevant — excluded
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 2);
  assertEquals(report.components?.["payment-gateway"], undefined);
});

Deno.test("service: a down relevant monitor is reflected in the verdict and named in the message", async () => {
  const { ctx } = mockCtx([
    { body: page([{ public_name: "Background Jobs Latency", status: "downtime" }], "major") },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/Background Jobs Latency/.test(report.message ?? ""), report.message);
});

Deno.test("service: an unclaimed/wrong page (fails to self-identify) reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        data: { attributes: { company_name: "Someone Else", custom_domain: "status.example.com" } },
        included: [],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page with none of the relevant monitors reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: page([{ public_name: "Some Other Thing", status: "operational" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
