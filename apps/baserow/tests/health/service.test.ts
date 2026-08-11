import { assert, assertEquals } from "@std/assert";
import service, {
  mapAggregateState,
  mapResourceStatus,
  resourceKey,
  STATUS_URL,
} from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

/** A page fixture in the exact shape Better Stack returns for status.baserow.org. */
function statusPage(
  resources: Array<{ name: string; status: string }>,
  aggregate = "operational",
  company = "Baserow",
) {
  return {
    data: {
      type: "status_page",
      attributes: {
        company_name: company,
        company_url: "https://baserow.io/",
        custom_domain: "status.baserow.org",
        aggregate_state: aggregate,
      },
    },
    included: [
      { id: "sec", type: "status_page_section", attributes: { name: "Current status by service" } },
      ...resources.map((r, i) => ({
        id: `res-${i}`,
        type: "status_page_resource",
        attributes: { public_name: r.name, status: r.status, availability: 0.999 },
      })),
    ],
  };
}

Deno.test("service: probes the one path on that host that returns JSON", () => {
  assertEquals(STATUS_URL, "https://status.baserow.org/index.json");
  assertEquals(service.network?.allow, ["status.baserow.org"]);
});

/** A check that reaches a third-party host must never be signed with the token. */
Deno.test("service: is unsigned and app-scoped", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

/**
 * Baserow is open source and heavily self-hosted, and this page covers only the
 * hosted service — so at any higher severity an incident on baserow.io would
 * pin every self-hosted tenant at `degraded`, which is untrue of their instance.
 */
Deno.test("service: is informational — it speaks only for Baserow's hosted service", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("mapResourceStatus: covers Better Stack's resource vocabulary", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("something_new"), "unknown");
});

Deno.test("mapAggregateState: covers the page-level roll-up", () => {
  assertEquals(mapAggregateState("operational"), "ok");
  assertEquals(mapAggregateState("degraded"), "degraded");
  assertEquals(mapAggregateState("downtime"), "down");
  assertEquals(mapAggregateState(undefined), "unknown");
});

Deno.test("resourceKey: slugifies the public name", () => {
  assertEquals(resourceKey({ attributes: { public_name: "Backend API" } }, 0), "backend-api");
  assertEquals(resourceKey({ id: "res-9" }, 1), "res-9");
});

Deno.test("service: reads the aggregate state and reports each resource", async () => {
  const { ctx } = mockCtx([{
    body: statusPage([
      { name: "Frontend", status: "operational" },
      { name: "Backend API", status: "operational" },
    ]),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).sort(), ["backend-api", "frontend"]);
});

/** The section entry in `included` is not a resource and must not become one. */
Deno.test("service: ignores non-resource entries in included", async () => {
  const { ctx } = mockCtx([{ body: statusPage([{ name: "Frontend", status: "operational" }]) }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(Object.keys(result.components ?? {}), ["frontend"]);
});

Deno.test("service: a degraded resource is reported and named", async () => {
  const { ctx } = mockCtx([{
    body: statusPage([
      { name: "Backend API", status: "degraded" },
      { name: "Frontend", status: "operational" },
    ], "degraded"),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes("Backend API"), result.message);
  assertEquals(result.components!["backend-api"].state, "degraded");
});

/**
 * The load-bearing case for this particular page: `status.baserow.org` answers
 * **200 with 483 KB of HTML** for any path it does not know, so a parse failure
 * is the expected signal that the JSON route has gone — not an anomaly. It must
 * report `unknown`, never be parsed as a status.
 */
Deno.test("service: HTML served at 200 is unknown, not a status", async () => {
  const { ctx } = mockCtx([{ body: "<!DOCTYPE html><html>…</html>" }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("/index.json"), result.message);
});

Deno.test("service: an unreachable status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

/**
 * Guards against the failure mode where a healthy, claimed status page belongs
 * to a different product entirely.
 */
Deno.test("service: refuses a page that no longer self-identifies as Baserow's", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        type: "status_page",
        attributes: {
          company_name: "Someone Else",
          company_url: "https://example.com/",
          custom_domain: "status.example.com",
          aggregate_state: "operational",
        },
      },
      included: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("self-identifies"), result.message);
});

/**
 * Rule 1 of the severity contract: an `unavailable` entry always reports
 * `unknown`, which outranks `ok`, so at any other severity it would pin the app
 * at `unknown` forever.
 */
Deno.test("quota: is declared unavailable with a reason, at informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("200 items per batch"));
});
