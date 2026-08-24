import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-08-24 (1,717 bytes, 6 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "01H1NMXHPTVBJ27HJPPZH3DD55", name: "HeyGen", url: "https://status.heygen.com/" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "01H1NMXJ689YRXE29XWFA5BJCK", name: "https://www.heygen.com", status: "operational" },
      { id: API_COMPONENT_ID, name: "https://api.heygen.com", status: "operational" },
      {
        id: "01KKYCQG8KPQM4RGEN1E0YSEXV",
        name: "https://www.liveavatar.com",
        status: "operational",
      },
      { id: "01H1NMXJ68A78D2263VQ5BXFCY", name: "https://app.heygen.com", status: "operational" },
      {
        id: "01KKYCQG8K7CCFHMRWNZZCE4Z8",
        name: "https://api.liveavatar.com",
        status: "operational",
      },
      {
        id: "01KKYCQG8K7SWXD06AKM5MERHE",
        name: "https://app.liveavatar.com",
        status: "operational",
      },
    ],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, unsigned", () => {
  assertEquals(STATUS_URL, "https://status.heygen.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.heygen.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 6);
});

/**
 * The failure this app actually calls into is `https://api.heygen.com` — an outage confined to a
 * different product (here, LiveAvatar) is real information but must not read as this app down.
 */
Deno.test("service: an outage in a different product caps at degraded, not down", async () => {
  const body = summary();
  (body.components[2] as { status: string }).status = "major_outage"; // liveavatar www
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.[API_COMPONENT_ID]?.state, "ok");
});

Deno.test("service: an outage in the API component itself reports down", async () => {
  const body = summary();
  (body.components[1] as { status: string }).status = "major_outage"; // https://api.heygen.com
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.components?.[API_COMPONENT_ID]?.state, "down");
});

Deno.test("service: an incident is reported with the affected components named", async () => {
  const body = summary({
    status: { indicator: "major", description: "Partial System Outage" },
    incidents: [{ name: "Elevated API errors", status: "investigating" }],
  });
  (body.components[1] as { status: string }).status = "partial_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assert(
    /https:\/\/api\.heygen\.com \(partial_outage\)/.test(report.message ?? ""),
    report.message,
  );
  assert(/1 open incident/.test(report.message ?? ""), report.message);
});

Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page with no components reports unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that no longer lists the API component reports unknown", async () => {
  const body = summary();
  body.components = body.components.filter((c) => c.id !== API_COMPONENT_ID);
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/no longer lists/i.test(report.message ?? ""), report.message);
});

/** Guards against a future redirect/rebrand silently pointing this probe at someone else's page. */
Deno.test("service: a page that stops self-identifying as HeyGen's reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({ page: { id: "x", name: "Somebody Else", url: "https://status.other.com" } }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: Statuspage's component vocabulary maps to the four health states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: the page indicator maps to the four health states", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});
