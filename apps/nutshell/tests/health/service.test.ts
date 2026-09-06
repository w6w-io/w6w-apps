import { assert, assertEquals } from "@std/assert";
import service, { APPLICATION_COMPONENT_ID, mapComponentStatus } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: is an unsigned, app-scoped service check with its own allowlist", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.nutshell.com"]);
});

Deno.test("mapComponentStatus: covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: reports ok when the Nutshell application component is operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: JSON.stringify({
      page: { id: "2qwvjdg4xvkv", name: "Nutshell", url: "https://status.nutshell.com" },
      components: [
        { id: APPLICATION_COMPONENT_ID, name: "Nutshell application", status: "operational" },
        { id: "other", name: "Business card scanner", status: "major_outage" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.nutshell.com/api/v2/components.json");
  assertEquals(report.state, "ok");
  // Unrelated components (business card scanner, etc.) must not affect the verdict.
  assertEquals(report.components?.[APPLICATION_COMPONENT_ID].state, "ok");
});

Deno.test("service: reports down only from the Nutshell application component, not unrelated ones", async () => {
  const { ctx } = mockCtx([{
    body: JSON.stringify({
      page: { id: "2qwvjdg4xvkv", name: "Nutshell", url: "https://status.nutshell.com" },
      components: [
        { id: APPLICATION_COMPONENT_ID, name: "Nutshell application", status: "major_outage" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/Nutshell application/.test(report.message ?? ""));
});

Deno.test("service: unrelated component outages do not report the app as down", async () => {
  const { ctx } = mockCtx([{
    body: JSON.stringify({
      page: { id: "2qwvjdg4xvkv", name: "Nutshell", url: "https://status.nutshell.com" },
      components: [
        { id: APPLICATION_COMPONENT_ID, name: "Nutshell application", status: "operational" },
        { id: "other", name: "Nutshell Support Chat", status: "major_outage" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: reports unknown, not down, when the page no longer self-identifies", async () => {
  const { ctx } = mockCtx([{
    body: JSON.stringify({ page: { url: "https://status.example.com" }, components: [] }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: reports unknown on a broken status API", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "gateway down" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: reports unknown when the named component disappears from the page", async () => {
  const { ctx } = mockCtx([{
    body: JSON.stringify({
      page: { url: "https://status.nutshell.com" },
      components: [{ id: "unrelated", name: "Billing", status: "operational" }],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
