import { assert, assertEquals } from "@std/assert";
import service, {
  COMPONENTS_URL,
  mapComponentStatus,
  mapPageStatus,
  SUMMARY_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(SUMMARY_URL, "https://status.airtop.ai/summary.json");
  assertEquals(COMPONENTS_URL, "https://status.airtop.ai/components.json");
  assertEquals(service.network?.allow, ["status.airtop.ai"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an UP page with an operational component reports ok", async () => {
  const { ctx, calls } = mockCtx([
    { body: { page: { name: "Airtop", url: "https://status.airtop.ai", status: "UP" } } },
    { body: { components: [{ id: "c1", name: "App", status: "OPERATIONAL" }] } },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, SUMMARY_URL);
  assertEquals(calls[1].url, COMPONENTS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.c1.state, "ok");
});

Deno.test("service: HASISSUES reports degraded, with affected components named", async () => {
  const { ctx } = mockCtx([
    { body: { page: { name: "Airtop", url: "https://status.airtop.ai", status: "HASISSUES" } } },
    { body: { components: [{ id: "c1", name: "App", status: "PARTIALOUTAGE" }] } },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.c1.state, "degraded");
  assert(/App \(PARTIALOUTAGE\)/.test(report.message ?? ""), report.message);
});

Deno.test("service: component detail is best-effort — the page verdict stands if it fails", async () => {
  const { ctx } = mockCtx([
    { body: { page: { name: "Airtop", url: "https://status.airtop.ai", status: "UP" } } },
    { status: 503, body: "" },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components, undefined);
});

Deno.test("service: a failing summary endpoint reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** Guards against a redirect silently pointing this probe at a different Instatus page. */
Deno.test("service: a page that stops self-identifying as Airtop's reports unknown", async () => {
  const { ctx } = mockCtx([
    { body: { page: { name: "Somebody Else", url: "https://status.other.com", status: "UP" } } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: mapPageStatus — confirmed and documented values, unknown default", () => {
  assertEquals(mapPageStatus("UP"), "ok");
  assertEquals(mapPageStatus("HASISSUES"), "degraded");
  assertEquals(mapPageStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapPageStatus("something-new"), "unknown");
  assertEquals(mapPageStatus(undefined), "unknown");
});

Deno.test("service: mapComponentStatus — the observed value plus the Statuspage-parallel vocabulary", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("DEGRADEDPERFORMANCE"), "degraded");
  assertEquals(mapComponentStatus("PARTIALOUTAGE"), "degraded");
  assertEquals(mapComponentStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapComponentStatus("MAJOROUTAGE"), "down");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});
