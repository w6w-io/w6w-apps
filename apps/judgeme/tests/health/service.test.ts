import { assertEquals } from "@std/assert";
import service, { mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<{ name: string; status: string }>) {
  return {
    page: { url: "https://status.judge.me" },
    components,
    incidents: [],
    scheduled_maintenances: [],
  };
}

Deno.test("service: probes the real status.judge.me summary endpoint", () => {
  assertEquals(STATUS_URL, "https://status.judge.me/api/v2/summary.json");
});

Deno.test("mapComponentStatus: covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: ok when the tracked components are operational", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { name: "Judge.me Product Reviews - Admin", status: "operational" },
      { name: "Judge.me Product Reviews - Storefront widgets", status: "operational" },
      { name: "AliExpress Review Importer", status: "major_outage" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: an unrelated component's outage never worsens the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { name: "Judge.me Product Reviews - Admin", status: "operational" },
      { name: "Judge.me Product Reviews - Storefront widgets", status: "operational" },
      { name: "Shopify Admin", status: "major_outage" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: down when the Admin component is in a major outage", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { name: "Judge.me Product Reviews - Admin", status: "major_outage" },
      { name: "Judge.me Product Reviews - Storefront widgets", status: "operational" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: unknown when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: undefined }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unknown when the page no longer self-identifies as Judge.me's", async () => {
  const { ctx } = mockCtx([{
    body: { page: { url: "https://status.example.com" }, components: [] },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: declares app scope and no credential — a status host must never see one", () => {
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.judge.me"]);
});
