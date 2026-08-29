import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: unsigned app-scoped check, widening egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.salesloft.com"]);
  assert(!service.network?.allow?.includes("api.salesloft.com"));
});

Deno.test("service: reports ok when Salesloft's own core components are operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "minor", description: "Partially Degraded Service" },
      components: [
        { name: "Salesloft Web Application", status: "operational" },
        { name: "VoIP Provider", status: "operational" },
        { name: "Salesforce", status: "major_outage" },
      ],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.salesloft.com/api/v2/summary.json");
  assertEquals(out.state, "ok");
  assertEquals(out.components?.["salesloft-web-application"], { state: "ok" });
  assertEquals(out.components?.["salesforce"], { state: "down" });
});

Deno.test("service: a core component outage decides the state even when the page indicator is minor", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "minor" },
      components: [
        { name: "Salesloft Web Application", status: "major_outage" },
        { name: "VoIP Provider", status: "operational" },
      ],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "down");
});

Deno.test("service: a third-party integration outage never worsens the state on its own", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "critical" },
      components: [
        { name: "Salesloft Web Application", status: "operational" },
        { name: "VoIP Provider", status: "operational" },
        { name: "Zoom", status: "major_outage" },
        { name: "LinkedIn", status: "major_outage" },
      ],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components?.["zoom"], { state: "down" });
});

Deno.test("service: skips group headers", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "none" },
      components: [
        { name: "Platform", status: "operational", group: true },
        { name: "Salesloft Web Application", status: "operational" },
      ],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(Object.keys(out.components ?? {}), ["salesloft-web-application"]);
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("503"));
});

Deno.test("service: no core component present reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: { status: { indicator: "none" }, components: [{ name: "Zoom", status: "operational" }] },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
});
