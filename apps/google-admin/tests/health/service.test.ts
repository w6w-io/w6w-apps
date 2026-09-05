import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: probes the Workspace status dashboard, not an API host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["www.google.com"]);
  assertEquals(service.minIntervalSeconds, 120);
  assertEquals(service.credential, undefined);
});

Deno.test("service: reports ok when no Admin Console incident is open", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      {
        service_name: "Admin Console",
        status_impact: "SERVICE_OUTAGE",
        end: "2026-01-01T00:00:00Z",
      },
      { service_name: "Google Drive", status_impact: "SERVICE_OUTAGE" },
    ],
  }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://www.google.com/appsstatus/dashboard/incidents.json");
  assertEquals(report.state, "ok");
});

Deno.test("service: an open Admin Console outage reports down with the vendor description", async () => {
  const { ctx } = mockCtx([{
    body: [{
      service_name: "Admin Console",
      status_impact: "SERVICE_OUTAGE",
      external_desc: "Directory API errors",
    }],
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message, "Directory API errors");
});

Deno.test("service: a disruption is degraded, information is ok", async () => {
  const { ctx } = mockCtx([{
    body: [
      { service_name: "Admin Console", status_impact: "SERVICE_DISRUPTION", external_desc: "Slow" },
      { service_name: "Admin Console", status_impact: "SERVICE_INFORMATION", external_desc: "FYI" },
    ],
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Slow; FYI");
});

Deno.test("service: an unrelated Workspace outage does not drag Admin Console down", async () => {
  const { ctx } = mockCtx([{
    body: [{
      service_name: "Google Drive",
      status_impact: "SERVICE_OUTAGE",
      external_desc: "Down",
    }],
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: reports unknown, never down, when the dashboard itself fails", async () => {
  const { ctx } = mockCtx([{ status: 503, statusText: "Service Unavailable", body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: reports unknown on an unexpected payload shape", async () => {
  const { ctx } = mockCtx([{ body: { incidents: [] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "status dashboard returned an unexpected shape");
});
