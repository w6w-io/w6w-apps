import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const summary = (
  indicator: string,
  components: Array<{ name: string; status: string; group?: boolean }>,
) => ({
  page: { id: "y13ml4pg4j8t", name: "Grain" },
  status: { indicator, description: indicator === "none" ? "All Systems Operational" : "Incident" },
  components,
});

Deno.test("service: reports ok with component breakdown when Grain is fully operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: summary("none", [
      { name: "Grain Desktop App", status: "operational" },
      { name: "Recording Processing", status: "operational" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["grain-desktop-app"].state, "ok");
  assertEquals(report.components?.["recording-processing"].state, "ok");
  assertEquals(new URL(calls[0].url).hostname, "www.grainstatus.com");
});

Deno.test("service: maps a major incident to down", async () => {
  const { ctx } = mockCtx([{
    body: summary("major", [{ name: "Recording Processing", status: "major_outage" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["recording-processing"].state, "down");
});

Deno.test("service: maps a minor incident to degraded", async () => {
  const { ctx } = mockCtx([{
    body: summary("minor", [{ name: "Grain Web App", status: "degraded_performance" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: reports unknown, not down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: skips group headers when building the component map", async () => {
  const { ctx } = mockCtx([{
    body: summary("none", [
      { name: "Recording", status: "operational", group: true },
      { name: "Recording Processing", status: "operational" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["recording-processing"]);
});

Deno.test("service: kind service, unauthenticated, egress restricted to the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["www.grainstatus.com"]);
});
