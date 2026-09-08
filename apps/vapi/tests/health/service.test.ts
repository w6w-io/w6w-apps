import { assert, assertEquals } from "@std/assert";
import service, {
  mapAggregateState,
  mapResourceStatus,
  resourceKey,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live page measured 2026-09-06. */
function page(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: "176132",
      type: "status_page",
      attributes: {
        company_name: "Vapi",
        company_url: "https://vapi.ai",
        custom_domain: "status.vapi.ai",
        aggregate_state: "operational",
      },
    },
    included: [
      {
        id: "8331917",
        type: "status_page_resource",
        attributes: { public_name: "Vapi API", explanation: "api.vapi.ai", status: "operational" },
      },
      {
        id: "8552532",
        type: "status_page_resource",
        attributes: { public_name: "OpenAI", status: "operational" },
      },
      {
        id: "8552527",
        type: "status_page_resource",
        attributes: { public_name: "Anthropic", status: "not_monitored" },
      },
    ],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.vapi.ai/index.json");
  assertEquals(service.network?.allow, ["status.vapi.ai"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: page() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["vapi-api"]?.state, "ok");
});

/** `not_monitored` is neither operational nor down — it must not read as healthy. */
Deno.test("service: a not_monitored provider reports unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: page() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.["anthropic"]?.state, "unknown");
});

Deno.test("service: a downtime resource reports down, aggregate wins over the fallback", async () => {
  const body = page();
  (body.included[0].attributes as { status: string }).status = "downtime";
  (body.data.attributes as { aggregate_state: string }).aggregate_state = "downtime";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.components?.["vapi-api"]?.state, "down");
  assert(/down: Vapi API \(downtime\)/.test(report.message ?? ""), report.message);
});

/** A broken status page says nothing about Vapi — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page with no attributes reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** Guards against a redirect/rebrand silently pointing this probe elsewhere. */
Deno.test("service: a page that stops self-identifying as Vapi's reports unknown", async () => {
  const body = page({
    data: {
      type: "status_page",
      attributes: { company_name: "Somebody Else", company_url: "https://status.other.com" },
    },
  });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: Better Stack's resource vocabulary maps to the four health states", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("resolved"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("down"), "down");
  assertEquals(mapResourceStatus("not_monitored"), "unknown");
  assertEquals(mapResourceStatus(undefined), "unknown");
});

Deno.test("service: the page-level aggregate_state maps to the four health states", () => {
  assertEquals(mapAggregateState("operational"), "ok");
  assertEquals(mapAggregateState("degraded"), "degraded");
  assertEquals(mapAggregateState("maintenance"), "degraded");
  assertEquals(mapAggregateState("downtime"), "down");
  assertEquals(mapAggregateState(undefined), "unknown");
});

Deno.test("resourceKey: prefers the public_name slug, falls back to the vendor id", () => {
  assertEquals(resourceKey({ attributes: { public_name: "Vapi API" } }, 0), "vapi-api");
  assertEquals(resourceKey({ id: "abc" }, 3), "abc");
  assertEquals(resourceKey({}, 7), "resource-7");
});

/** With no page-level indicator the verdict falls back to the worst component. */
Deno.test("service: with no aggregate_state the verdict is the worst component", async () => {
  const body = page({
    data: {
      type: "status_page",
      attributes: { company_name: "Vapi", company_url: "https://vapi.ai" },
    },
  });
  (body.included[0].attributes as { status: string }).status = "degraded";

  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});
