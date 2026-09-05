import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";

Deno.test("service: reports ok when the API endpoints component is operational", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      page: { id: "3h0654tlc7c0", name: "Teamleader", url: "https://status.teamleader.eu" },
      components: [
        { id: API_COMPONENT_ID, name: "API endpoints", status: "operational" },
        { id: "other", name: "Dashboard", status: "operational" },
      ],
      incidents: [],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(out.components?.[API_COMPONENT_ID].state, "ok");
});

Deno.test("service: reports degraded when the API endpoints component is degraded", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { url: "https://status.teamleader.eu" },
      components: [{ id: API_COMPONENT_ID, name: "API endpoints", status: "partial_outage" }],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("service: reports unknown when the component is missing from the page", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { page: { url: "https://status.teamleader.eu" }, components: [] },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: reports unknown, never down, when the status page itself errors", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: reports unknown when the page no longer self-identifies as Teamleader's", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { page: { url: "https://status.example.com" }, components: [] },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("mapComponentStatus: maps the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: declares no credential and only widens egress to the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.teamleader.eu"]);
});
