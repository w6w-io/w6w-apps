import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_HOST,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = { id: "glgfnjclpmlj", name: "Aircall", url: "https://status.aircall.com" };

function summary(over: Record<string, unknown> = {}) {
  return {
    page: PAGE,
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: API_COMPONENT_ID, name: "API & Webhooks", status: "operational", group: false },
      { id: "ggbcpnmjdklc", name: "Inbound Calls", status: "operational", group: false },
      { id: "grw7fmhgp12x", name: "Integrations & APIs", status: "operational", group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...over,
  };
}

/**
 * The finding: `status.aircall.io` — the name matching the product's own domain
 * — **301s** to `status.aircall.com`. A health check may only reach hosts it
 * declares and the runtime does not follow a redirect out through the
 * allowlist, so declaring the `.io` name yields a check that fails on the
 * redirect. Pinned in three places at once so they cannot drift.
 */
Deno.test("service: declares, and calls, the host that answers without a redirect", () => {
  assertEquals(STATUS_HOST, "status.aircall.com");
  assertEquals(service.network?.allow, ["status.aircall.com"]);
  assert(STATUS_URL.startsWith("https://status.aircall.com/"), STATUS_URL);
  assert(
    !STATUS_URL.includes("status.aircall.io"),
    "status.aircall.io 301s — a declared host must be the one that answers",
  );
});

Deno.test("service: reports ok and one component per non-group row", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  // Three rows in, two out: the group row would double-count its children.
  assertEquals(Object.keys(report.components ?? {}).length, 2);
  assert(API_COMPONENT_ID in (report.components ?? {}));
});

/**
 * A status page that says nothing about the API is not a statement about this
 * app. `API & Webhooks` is the component that is, and an incident on it is
 * called out by name rather than left in a list of fifty.
 */
Deno.test("service: an incident on the API component is named explicitly", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        status: { indicator: "major", description: "Partial outage" },
        components: [
          { id: API_COMPONENT_ID, name: "API & Webhooks", status: "major_outage", group: false },
          { id: "ggbcpnmjdklc", name: "Inbound Calls", status: "operational", group: false },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded", "a `major` indicator is degraded, not down");
  assert(report.message!.includes("the API this app calls is affected"), report.message);
  assertEquals(report.components![API_COMPONENT_ID].state, "down");
});

Deno.test("service: an unrelated component does not name the API", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        status: { indicator: "minor", description: "Minor incident" },
        components: [
          { id: API_COMPONENT_ID, name: "API & Webhooks", status: "operational", group: false },
          { id: "5n7j0tzsrcld", name: "Aircall Mobile App (iOS)", status: "partial_outage" },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assert(!report.message!.includes("the API this app calls"), report.message);
  assert(report.message!.includes("Aircall Mobile App (iOS)"), report.message);
});

/** A broken status API says nothing about Aircall — never `down`. */
Deno.test("service: a 500 from the status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

/**
 * The failure mode where a healthy, claimed status page belongs to an entirely
 * different product — which is exactly what a future redirect or rebrand would
 * produce here, given the `.io` / `.com` split.
 */
Deno.test("service: a page identifying as someone else is unknown", async () => {
  const { ctx } = mockCtx([
    { body: summary({ page: { id: "x", name: "Nope", url: "https://status.example.com" } }) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no longer self-identifies"), report.message);
});

Deno.test("service: an empty component list is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: the Statuspage vocabularies map as documented", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: componentKey prefers the vendor id and falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc", name: "API & Webhooks" }, 0), "abc");
  assertEquals(componentKey({ name: "API & Webhooks" }, 4), "api-webhooks-4");
  assertEquals(componentKey({}, 7), "component-7");
});

/** A check that widens egress must never be signed — a status host sees no token. */
Deno.test("service: widens egress only under an unsigned posture", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});
