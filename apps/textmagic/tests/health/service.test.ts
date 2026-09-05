import { assertEquals } from "@std/assert";
import service, { STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = { url: "https://status.textmagic.com" };

function summary(components: Array<{ id: string; name: string; status: string }>) {
  return {
    page: PAGE,
    status: { indicator: "none", description: "All systems operational" },
    components,
  };
}

Deno.test("service: all-operational reports ok", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: summary([
        { id: "a", name: "SMS API Gateway", status: "operational" },
        { id: "b", name: "Sending text messages (Outbound SMS)", status: "operational" },
        { id: "c", name: "Mobile App", status: "major_outage" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.a.state, "ok");
  // A Mobile App outage is reported per-component but does not drag the verdict down.
  assertEquals(report.components?.c.state, "down");
});

Deno.test("service: a degraded SMS API Gateway drives the top-level state", async () => {
  const { ctx } = mockCtx([
    {
      body: summary([
        { id: "a", name: "SMS API Gateway", status: "partial_outage" },
        { id: "b", name: "Sending text messages (Outbound SMS)", status: "operational" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: a broken status endpoint is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as TextMagic is unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { url: "https://status.example.com" },
        components: [{ id: "a", name: "X", status: "operational" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unsigned, app-scoped, and widens only to the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.textmagic.com"]);
});
