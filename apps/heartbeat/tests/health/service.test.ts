import { assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  STATUS_URL,
  TRACKED_COMPONENT_NAME,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(componentStatus: string, indicator = "none") {
  return {
    page: { id: "ccmqxzqxfb5n", name: "Heartbeat", url: "https://status.heartbeat.chat" },
    components: [
      { id: "93bxprzhwsnc", name: TRACKED_COMPONENT_NAME, status: componentStatus, group: false },
      { id: "3pdldtf7z7yy", name: "Mobile Apps", status: "major_outage", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator, description: "All Systems Operational" },
  };
}

Deno.test("service: reads status.heartbeat.chat/api/v2/summary.json", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: operational Heartbeat Communities reports ok, ignoring the down Mobile Apps", async () => {
  const { ctx } = mockCtx([{ body: summary("operational") }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("service: a degraded Heartbeat Communities component reports degraded", async () => {
  const { ctx } = mockCtx([{ body: summary("partial_outage") }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("service: a major outage on the tracked component reports down", async () => {
  const { ctx } = mockCtx([{ body: summary("major_outage") }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Heartbeat's reports unknown", async () => {
  const s = summary("operational");
  s.page.url = "https://status.someone-else.example";
  const { ctx } = mockCtx([{ body: s }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: credential none, app-scoped, widens egress to the status host only", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.heartbeat.chat"]);
});
