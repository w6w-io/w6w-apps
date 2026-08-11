import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: probes the status host Paddle's own docs name", () => {
  assertEquals(STATUS_URL, "https://paddlestatus.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["paddlestatus.com"]);
});

/** A check that reaches a third-party host must never be signed with the API key. */
Deno.test("service: is unsigned and app-scoped", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

/**
 * Unlike the metabase equivalent, this one keeps the `degraded` default for its
 * kind: Paddle is SaaS-only, so an incident on this page is evidence about
 * every connection, not just hosted ones.
 */
Deno.test("service: keeps the degraded default — there is no self-hosted Paddle", () => {
  assertEquals(service.severity, undefined);
});

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");
});

Deno.test("mapIndicator: covers the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

/**
 * The finding this check exists to survive: Paddle's page has 25 components and
 * about eight distinct names, because each service publishes one row per
 * environment. Keying by name would collapse them and let a healthy row
 * overwrite a broken one.
 */
Deno.test("componentKey: uses the vendor id so identically-named rows stay distinct", () => {
  const a = { id: "01K33R0DH39JC7EQDKTTBQACAX", name: "Production - Billing" };
  const b = { id: "01K33R0DH33M9PMV1EHWDZ9B52", name: "Production - Billing" };
  assert(componentKey(a, 0) !== componentKey(b, 2), "same name must not collapse to one key");
});

Deno.test("componentKey: falls back to a name slug when a row carries no id", () => {
  assertEquals(componentKey({ name: "Production - Billing" }, 3), "production-billing-3");
  assertEquals(componentKey({}, 4), "component-4");
});

Deno.test("service: reports every component separately even when names repeat", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { id: "01K33AAG63VDSYC4PWDAKA31Z5", name: "Paddle", url: "https://paddlestatus.com/" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "c1", name: "Production - Billing", status: "operational" },
        { id: "c2", name: "Production - Billing", status: "operational" },
        { id: "c3", name: "Sandbox - Billing", status: "operational" },
      ],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).length, 3);
});

Deno.test("service: a partial outage is reported as degraded and named", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Paddle", url: "https://paddlestatus.com/" },
      status: { indicator: "minor", description: "Partially Degraded Service" },
      components: [
        { id: "c1", name: "Production - Billing", status: "partial_outage" },
        { id: "c2", name: "Sandbox - Billing", status: "operational" },
      ],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes("Production - Billing"), result.message);
  assertEquals(result.components!["c1"].state, "degraded");
  assertEquals(result.components!["c2"].state, "ok");
});

/**
 * incident.io omits `incidents` entirely when nothing is open — it does not
 * send `[]`. Reading `.length` off it unguarded would throw on the live page.
 */
Deno.test("service: survives a summary with no incidents key at all", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Paddle", url: "https://paddlestatus.com/" },
      status: { indicator: "none" },
      components: [{ id: "c1", name: "Production - Billing", status: "operational" }],
      scheduled_maintenances: [{ id: "m1", name: "Database maintenance", status: "scheduled" }],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assert(result.message!.includes("1 scheduled maintenance"), result.message);
});

/** A broken status page says nothing about Paddle — it must never report `down`. */
Deno.test("service: an unreachable or unreadable status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");

  const bad = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({} as never, bad.ctx)).state, "unknown");
});

/**
 * Guards against the failure mode where a healthy, claimed status page belongs
 * to a different product entirely.
 */
Deno.test("service: refuses a status page that no longer self-identifies as Paddle's", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Someone Else", url: "https://status.example.com/" },
      status: { indicator: "none" },
      components: [{ id: "c1", name: "API", status: "operational" }],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("self-identifies"), result.message);
});

Deno.test("service: no components is unknown rather than a vacuous ok", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { url: "https://paddlestatus.com/" },
      status: { indicator: "none" },
      components: [],
    },
  }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

/**
 * Rule 1 of the severity contract: an `unavailable` entry always reports
 * `unknown`, which outranks `ok`, so at any other severity it would pin the app
 * at `unknown` forever.
 */
Deno.test("quota: is declared unavailable with a reason, at informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("240 requests/minute"));
});
