import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { STATUS_URL } from "../../health/service.ts";

const PAGE = { id: "xpd61d54mz8y", name: "Drip", url: "https://status.drip.com" };

Deno.test("service: probes status.drip.com/api/v2/summary.json", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      page: PAGE,
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ name: "REST and JavaScript APIs", status: "operational" }],
    },
  }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: all-operational maps to ok, with the API component reported", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: PAGE,
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "REST and JavaScript APIs", status: "operational" },
        { name: "User Interface", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["rest-and-javascript-apis"], { state: "ok" });
});

Deno.test("service: a major outage on the API component maps to down", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: PAGE,
      status: { indicator: "critical", description: "API outage" },
      components: [{ name: "REST and JavaScript APIs", status: "major_outage" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["rest-and-javascript-apis"].state, "down");
});

Deno.test("service: skips group-header components", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: PAGE,
      status: { indicator: "none" },
      components: [
        { name: "Storage", status: "operational", group: true },
        { name: "REST and JavaScript APIs", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["rest-and-javascript-apis"]);
});

Deno.test("service: a failed status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Drip's reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { id: "x", name: "Someone Else", url: "https://status.example.com" },
      status: { indicator: "none" },
      components: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
