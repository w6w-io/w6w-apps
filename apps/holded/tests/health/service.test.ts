import { assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(apiStatus: string, extra: Record<string, unknown> = {}) {
  return {
    page: { id: "k5ltb2nqf6zg", name: "Holded", url: "https://holded.health" },
    components: [
      { id: "prh124v9kxfz", name: "Holded Web", status: "operational" },
      { id: API_COMPONENT_ID, name: "Holded API", status: apiStatus },
      { id: "qngbttbmkw5d", name: "Holded POS App (iOS/Android)", status: "operational" },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...extra,
  };
}

Deno.test("service: metadata", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(STATUS_URL, "https://holded.statuspage.io/api/v2/summary.json");
});

Deno.test("mapComponentStatus: the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("check: operational Holded API -> ok, ignores an unrelated component's status", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary("operational", {
      components: [
        { id: "prh124v9kxfz", name: "Holded Web", status: "major_outage" },
        { id: API_COMPONENT_ID, name: "Holded API", status: "operational" },
      ],
    }),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("check: degraded Holded API -> degraded, with a message", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("partial_outage") }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.message?.includes("partial_outage"), true);
});

Deno.test("check: major outage -> down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("major_outage") }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("check: broken status API -> unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("check: unreadable body -> unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/plain" },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("check: page no longer self-identifies as Holded's -> unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      ...summary("operational"),
      page: { id: "x", name: "Someone Else", url: "https://example.com" },
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("check: component list no longer carries a Holded API entry -> unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      ...summary("operational"),
      components: [{ id: "other", name: "Something Else", status: "operational" }],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});
