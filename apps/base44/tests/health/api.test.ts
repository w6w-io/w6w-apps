import { assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("health/api: ok when the Monitoring API reports healthy", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "healthy", service: "monitoring-api", version: "2.0.0" },
  }]);
  const report = await check.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/monitoring/health");
  assertEquals(report.state, "ok");
});

Deno.test("health/api: down on a 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "service unavailable" }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("health/api: unknown on an unexpected body shape", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: "nope" } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("health/api: unknown, not down, on a non-5xx error status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("health/api: down when the fetch itself throws", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("network down")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("health/api: declares no credential and the dependency kind", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.credential, "none");
});
