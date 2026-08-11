import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_HOST,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The 16 components the live page published on 2026-08-11, with their real ids. */
const LIVE_COMPONENTS = [
  { id: "18l7w4pqw339", name: "Website" },
  { id: "fzpykzyzkqjq", name: "Billing" },
  { id: "7k0nbzrhc3wx", name: "On-Site Player" },
  { id: "n7kws3gg251j", name: "Embedded Player" },
  { id: "sqbzqqhfjlky", name: "Upload" },
  { id: "xrgg7v2t004n", name: "Create" },
  { id: "pvr74198g4mz", name: "Conversion" },
  { id: "glk5qg36x9hy", name: "API" },
  { id: "0nft3wfvz2h4", name: "Mobile/ TV Apps" },
  { id: "xhqgvgy4w20k", name: "Live Analytics" },
  { id: "bg2ks19yp4pz", name: "Support Systems" },
  { id: "mg4gzlwhzxtw", name: "Live streaming features" },
  { id: "nppg1h8q8g3y", name: "VOD Analytics" },
  { id: "myf1j6404zt4", name: "Record" },
  { id: "h64gy89lq0tq", name: "Editor" },
  { id: "p3j2fv1y2tfl", name: "Interactive" },
];

function summary(
  overrides: Partial<{
    indicator: string;
    description: string;
    components: Array<Record<string, unknown>>;
    incidents: unknown[];
    scheduled_maintenances: unknown[];
    pageUrl: string;
  }> = {},
) {
  return {
    page: {
      id: "sccqh0pnqrh8",
      name: "Vimeo",
      url: overrides.pageUrl ?? "https://www.vimeostatus.com",
    },
    components: overrides.components ??
      LIVE_COMPONENTS.map((c) => ({ ...c, status: "operational", group: false })),
    incidents: overrides.incidents ?? [],
    scheduled_maintenances: overrides.scheduled_maintenances ?? [],
    status: {
      indicator: overrides.indicator ?? "none",
      description: overrides.description ?? "All Systems Operational",
    },
  };
}

/**
 * `status.vimeo.com` 301-redirects to `www.vimeostatus.com`, and a health check
 * may only reach hosts it declared — so following that redirect is either
 * blocked or parses a Cloudflare interstitial as a status document.
 */
Deno.test("service: calls the canonical status host, which is not status.vimeo.com", () => {
  assertEquals(STATUS_HOST, "www.vimeostatus.com");
  assertEquals(STATUS_URL, "https://www.vimeostatus.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["www.vimeostatus.com"]);
});

/** A status host must never see a credential — which is why egress may widen at all. */
Deno.test("service: is an app-scoped, unsigned check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
});

Deno.test("service: maps Statuspage's component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("service: maps the page-level indicator", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: keys components by the vendor's id, falling back to a slug", () => {
  assertEquals(componentKey({ id: "glk5qg36x9hy", name: "API" }, 0), "glk5qg36x9hy");
  assertEquals(componentKey({ name: "Mobile/ TV Apps" }, 3), "mobile-tv-apps-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: a healthy page reports ok with every component named", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 16);
  // The key is an opaque vendor id, so the name has to travel in the message.
  assertEquals(report.components?.["glk5qg36x9hy"], { state: "ok", message: "API" });
  assertEquals(report.message, "All Systems Operational");
});

Deno.test("service: a degraded component is reported by name, and the state follows", async () => {
  const components = LIVE_COMPONENTS.map((c) => ({
    ...c,
    status: c.name === "Upload" ? "partial_outage" : "operational",
    group: false,
  }));
  const { ctx } = mockCtx([{
    body: summary({ components, indicator: "minor", description: "Partial System Outage" }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["sqbzqqhfjlky"].state, "degraded");
  assert(report.message?.includes("Upload (partial_outage)"), report.message);
});

Deno.test("service: a major outage on the page indicator reports down", async () => {
  const { ctx } = mockCtx([{ body: summary({ indicator: "critical" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: open incidents and maintenance windows are counted in the message", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      indicator: "minor",
      incidents: [{ name: "Playback issues", status: "investigating" }],
      scheduled_maintenances: [{ name: "DB upgrade" }],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assert(report.message?.includes("1 open incident(s)"), report.message);
  assert(report.message?.includes("1 scheduled maintenance window(s)"), report.message);
});

Deno.test("service: group rows are skipped, not reported as components", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "grp", name: "Platform", status: "operational", group: true },
        { id: "glk5qg36x9hy", name: "API", status: "operational", group: false },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["glk5qg36x9hy"]);
});

/** A broken status API says nothing about Vimeo. It must never read as `down`. */
Deno.test("service: a failing status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "nope" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("503"), report.message);
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page with no components is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("no components"), report.message);
});

/**
 * The failure mode that reads as success: a healthy, claimed status page
 * belonging to an entirely different product.
 */
Deno.test("service: a page that stops self-identifying as Vimeo's is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ pageUrl: "https://status.notvimeo.example" }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("self-identifies"), report.message);
});

Deno.test("service: the bare vimeostatus.com host still passes the self-identification guard", async () => {
  const { ctx } = mockCtx([{ body: summary({ pageUrl: "https://vimeostatus.com/" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/** With no page-level indicator the verdict is the worst component. */
Deno.test("service: without an indicator the state is the worst component", async () => {
  const body = summary({
    components: [
      { id: "a", name: "API", status: "operational", group: false },
      { id: "b", name: "Upload", status: "major_outage", group: false },
    ],
  }) as Record<string, unknown>;
  delete (body.status as Record<string, unknown>).indicator;
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});
