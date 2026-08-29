import { assertEquals } from "@std/assert";
import service, {
  mapAggregateState,
  mapResourceStatus,
  resourceKey,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = {
  data: {
    type: "status_page",
    attributes: { company_name: "CloudConvert", aggregate_state: "operational" },
  },
  included: [
    {
      type: "status_page_resource",
      id: "1",
      attributes: { public_name: "Webinterface", status: "operational" },
    },
    {
      type: "status_page_resource",
      id: "2",
      attributes: { public_name: "API", status: "operational" },
    },
    { type: "status_page_section", id: "3", attributes: { name: "Endpoints" } },
  ],
};

Deno.test("service: mapResourceStatus() covers Better Stack's vocabulary", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("resolved"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("down"), "down");
  assertEquals(mapResourceStatus(undefined), "unknown");
  assertEquals(mapResourceStatus("something-new"), "unknown");
});

Deno.test("service: mapAggregateState() mirrors the resource vocabulary", () => {
  assertEquals(mapAggregateState("operational"), "ok");
  assertEquals(mapAggregateState("downtime"), "down");
});

Deno.test("service: resourceKey() slugifies the public name, falling back to id", () => {
  assertEquals(resourceKey({ attributes: { public_name: "API" } }, 0), "api");
  assertEquals(resourceKey({ attributes: { public_name: "US East" } }, 0), "us-east");
  assertEquals(resourceKey({ id: "9" }, 0), "9");
  assertEquals(resourceKey({}, 4), "resource-4");
});

Deno.test("service: check() reports ok with all components operational", async () => {
  const { ctx } = mockCtx([{ status: 200, body: PAGE }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}).length, 2);
});

Deno.test("service: check() only counts status_page_resource entries, not sections", async () => {
  const { ctx } = mockCtx([{ status: 200, body: PAGE }]);
  const out = await service.check!({}, ctx);
  assertEquals(Object.keys(out.components ?? {}), ["webinterface", "api"]);
});

Deno.test("service: check() trusts the page's own aggregate_state over a local fold", async () => {
  const degradedPage = {
    ...PAGE,
    data: { ...PAGE.data, attributes: { ...PAGE.data.attributes, aggregate_state: "downtime" } },
  };
  const { ctx } = mockCtx([{ status: 200, body: degradedPage }]);
  const out = await service.check!({}, ctx);
  // Every component is operational, but the vendor's own aggregate says otherwise —
  // the check must report what the vendor rolled up, not what it recomputed locally.
  assertEquals(out.state, "down");
});

Deno.test("service: check() reports a degraded component by name", async () => {
  const degraded = {
    data: { ...PAGE.data, attributes: { ...PAGE.data.attributes, aggregate_state: "degraded" } },
    included: [
      {
        type: "status_page_resource",
        id: "1",
        attributes: { public_name: "API", status: "degraded" },
      },
    ],
  };
  const { ctx } = mockCtx([{ status: 200, body: degraded }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assertEquals(out.components?.api.state, "degraded");
  assertEquals(out.message?.includes("API (degraded)"), true);
});

Deno.test("service: check() reports unknown, never down, on a broken status page", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: check() reports unknown when the page no longer self-identifies", async () => {
  const wrongPage = {
    data: { attributes: { company_name: "Somebody Else", aggregate_state: "operational" } },
    included: PAGE.included,
  };
  const { ctx } = mockCtx([{ status: 200, body: wrongPage }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: check() reports unknown on an unparseable body", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/plain" },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: declares its own status.cloudconvert.com allowlist, not the app-level one", () => {
  assertEquals(service.network?.allow, ["status.cloudconvert.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});
