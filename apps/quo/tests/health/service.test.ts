import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import service, { STATUS_HOST } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = {
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { name: "Quo API", status: "operational", group: false },
    { name: "Calling", status: "operational", group: false },
    { name: "Voicemail", status: "major_outage", group: false },
    { name: "Group header", status: "operational", group: true },
  ],
};

Deno.test("service: reports ok with per-component detail on a healthy summary", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ name: "Quo API", status: "operational" }],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, `https://${STATUS_HOST}/api/v2/summary.json`);
  assertEquals(out.components?.["quo-api"].state, "ok");
});

Deno.test("service: a component in major_outage reports down, group headers are skipped", async () => {
  const { ctx } = mockCtx([{ status: 200, body: SUMMARY }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.components?.["voicemail"].state, "down");
  assertEquals("group-header" in (out.components ?? {}), false);
});

Deno.test("service: maps the page-level indicator, not just components", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: { indicator: "critical" }, components: [] },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: a network failure reports unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("boom")),
    log: () => {},
  } as unknown as HookContext;
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assertEquals(out.message?.includes("boom"), true);
});

Deno.test("service: is app-scoped and needs no credential", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, [STATUS_HOST]);
});
