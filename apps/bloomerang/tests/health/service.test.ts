import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: declares an app-scoped, unsigned check against the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["bloomerang.statuspage.io"]);
  assert(service.credential === undefined || service.credential === "none");
  assert(typeof service.check === "function");
});

Deno.test("service: reads the CRM API component and reports ok when operational", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      status: { description: "All Systems Operational" },
      components: [
        { name: "CRM App - crm.bloomerang.co", status: "operational" },
        { name: "CRM API - api.bloomerang.co", status: "operational" },
        { name: "Volunteer App - volunteer.bloomerang.co", status: "major_outage" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://bloomerang.statuspage.io/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.components?.["crm-api"].state, "ok");
});

Deno.test("service: maps every per-component status for the CRM API component", async () => {
  const cases: Array<[string, string]> = [
    ["operational", "ok"],
    ["degraded_performance", "degraded"],
    ["partial_outage", "degraded"],
    ["major_outage", "down"],
    ["under_maintenance", "degraded"],
    ["something_new", "unknown"],
  ];
  for (const [status, expected] of cases) {
    const { ctx } = mockCtx([{
      status: 200,
      body: { components: [{ name: "CRM API - api.bloomerang.co", status }] },
    }]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, expected, status);
  }
});

Deno.test("service: an unrelated component being down does not affect this app's verdict", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        { name: "CRM API - api.bloomerang.co", status: "operational" },
        { name: "Volunteer App - volunteer.bloomerang.co", status: "major_outage" },
        { name: "AWS ec2-us-west-2", status: "major_outage" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: reports unknown, not down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: reports unknown when the CRM API component is missing from the feed", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
