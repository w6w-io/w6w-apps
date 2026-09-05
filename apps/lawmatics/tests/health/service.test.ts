import { assertEquals } from "@std/assert";
import service, {
  mapResourceStatus,
  resourceKey,
  TRACKED_RESOURCE_NAME,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function statusPage(resources: Array<{ public_name: string; status: string }>) {
  return {
    data: {
      type: "status_page",
      attributes: { company_name: "Lawmatics", custom_domain: "status.lawmatics.com" },
    },
    included: resources.map((r, i) => ({
      id: String(i),
      type: "status_page_resource",
      attributes: { public_name: r.public_name, status: r.status },
    })),
  };
}

Deno.test("service: reports the tracked OAuth2.0 API resource's own state, not the others'", async () => {
  const { ctx } = mockCtx([{
    body: statusPage([
      { public_name: "Lawmatics API", status: "downtime" },
      { public_name: TRACKED_RESOURCE_NAME, status: "operational" },
      { public_name: "Lawmatics Website - www.lawmatics.com", status: "downtime" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: a downtime OAuth2.0 API resource reports down", async () => {
  const { ctx } = mockCtx([{
    body: statusPage([{ public_name: TRACKED_RESOURCE_NAME, status: "downtime" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a page that no longer identifies as Lawmatics reports unknown, never down", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        type: "status_page",
        attributes: { company_name: "SomeoneElse", custom_domain: "x.com" },
      },
      included: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: the tracked resource missing from the page reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: statusPage([{ public_name: "Lawmatics API", status: "operational" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("mapResourceStatus: covers Better Stack's vocabulary", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("not_monitored"), "unknown");
  assertEquals(mapResourceStatus(undefined), "unknown");
});

Deno.test("resourceKey: slugifies the public name", () => {
  assertEquals(
    resourceKey({ attributes: { public_name: TRACKED_RESOURCE_NAME } }, 0),
    "lawmatics-oauth2-0-api",
  );
  assertEquals(resourceKey({ id: "9" }, 0), "9");
});

Deno.test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.lawmatics.com"]);
});
