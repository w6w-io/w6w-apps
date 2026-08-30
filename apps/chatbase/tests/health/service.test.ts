import type { HookContext } from "@w6w/types";
import { assertEquals } from "@std/assert";
import service, { HEALTH_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: probes the API's own /health, unauthenticated", () => {
  assertEquals(HEALTH_URL, "https://www.chatbase.co/api/v2/health");
  assertEquals(service.credential, "none");
  // No additional network.allow: the API host is already in the app's manifest.
  assertEquals(service.network, undefined);
});

Deno.test("service: status ok reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok", timestamp: 1770681600 } }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, HEALTH_URL);
  assertEquals(report.state, "ok");
});

Deno.test("service: a 5xx reports down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a non-5xx failure reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a 200 with an unexpected body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { status: "degraded" } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a fetch that throws reports down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("network unreachable")),
    log: () => {},
  } as unknown as HookContext;
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});
