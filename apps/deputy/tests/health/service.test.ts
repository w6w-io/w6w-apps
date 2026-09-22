import { assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  STATUS_URL,
  TRACKED_COMPONENTS,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(
  components: Array<{ id: string; status: string }>,
  pageUrl = "https://status.deputy.com",
) {
  return {
    page: { id: "2c2rnpjspjm9", name: "Deputy.com", url: pageUrl },
    components: components.map((c) => ({
      id: c.id,
      name: TRACKED_COMPONENTS[c.id] ?? c.id,
      status: c.status,
    })),
    incidents: [],
    scheduled_maintenances: [],
  };
}

Deno.test("mapComponentStatus: maps Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something_new"), "unknown");
});

Deno.test("check: all tracked components operational -> ok", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: summary([
      { id: "zg6tq4vnjk8d", status: "operational" },
      { id: "bhphp9znxrkg", status: "operational" },
      { id: "yxx9yjs32q18", status: "operational" },
      { id: "jz98n2lh3hff", status: "operational" },
    ]),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("check: a major outage on one tracked region reports down, worst-state wins", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([
      { id: "zg6tq4vnjk8d", status: "operational" },
      { id: "bhphp9znxrkg", status: "major_outage" },
      { id: "yxx9yjs32q18", status: "operational" },
      { id: "jz98n2lh3hff", status: "operational" },
    ]),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assertEquals(result.message?.includes("Deputy - USA"), true);
});

Deno.test("check: third-party components (Pusher, Twilio, Xero, Zuora) never affect the verdict", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { id: "2c2rnpjspjm9", name: "Deputy.com", url: "https://status.deputy.com" },
      components: [
        { id: "zg6tq4vnjk8d", name: "Deputy - All regions", status: "operational" },
        { id: "bhphp9znxrkg", name: "Deputy - USA", status: "operational" },
        { id: "yxx9yjs32q18", name: "Deputy - AU", status: "operational" },
        { id: "jz98n2lh3hff", name: "Deputy - UK", status: "operational" },
        { id: "pusher-rest-api-id", name: "Pusher Pusher REST API", status: "major_outage" },
      ],
      incidents: [],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("check: a non-ok status response is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("check: a page that no longer self-identifies as Deputy's is refused", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary(
      [{ id: "zg6tq4vnjk8d", status: "operational" }],
      "https://status.some-other-vendor.com",
    ),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("check: a page that dropped every tracked component id is unknown, not ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { id: "2c2rnpjspjm9", name: "Deputy.com", url: "https://status.deputy.com" },
      components: [{ id: "some-renamed-id", name: "Deputy - All regions", status: "operational" }],
      incidents: [],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("manifest shape: unsigned, service-kind, scoped to status.deputy.com only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.deputy.com"]);
});
