import { assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  parseComponentTitle,
} from "../../health/service.ts";

function feedEntry(title: string) {
  return { title, summary: "", summaryHtml: "", publishedAt: new Date().toISOString() };
}

Deno.test("parseComponentTitle: splits '{component} - {status}'", () => {
  assertEquals(parseComponentTitle("Tumblr API - Operational"), {
    name: "Tumblr API",
    status: "Operational",
  });
  assertEquals(parseComponentTitle("Tumblr Dashboard - Degraded Performance"), {
    name: "Tumblr Dashboard",
    status: "Degraded Performance",
  });
});

Deno.test("mapComponentStatus: covers the vendor's own incident_status_id_list vocabulary", () => {
  assertEquals(mapComponentStatus("Operational"), "ok");
  assertEquals(mapComponentStatus("Informational"), "ok");
  assertEquals(mapComponentStatus("Degraded Performance"), "degraded");
  assertEquals(mapComponentStatus("Under Maintenance"), "degraded");
  assertEquals(mapComponentStatus("Partial Outage"), "down");
  assertEquals(mapComponentStatus("Major Outage"), "down");
  assertEquals(mapComponentStatus("Something New"), "unknown");
});

Deno.test("componentKey: slugifies the vendor's component name", () => {
  assertEquals(componentKey("Tumblr API"), "tumblr-api");
  assertEquals(componentKey("Tumblr Dashboard"), "tumblr-dashboard");
});

Deno.test("service.check: ok when all three Tumblr components are operational", () => {
  const feed = {
    entries: [],
    latest: [
      feedEntry("Tumblr API - Operational"),
      feedEntry("Tumblr Dashboard - Operational"),
      feedEntry("Tumblr Sites - Operational"),
      feedEntry("WordPress.com - Operational"),
    ],
    fetchedAt: new Date().toISOString(),
  };
  const out = service.check!({ feed }, { fetch: () => Promise.reject(), log: () => {} } as never);
  const report = out as { state: string; components?: Record<string, unknown> };
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 3);
  assertEquals("wordpress-com" in (report.components ?? {}), false);
});

Deno.test("service.check: degraded when one Tumblr component degrades", () => {
  const feed = {
    entries: [],
    latest: [
      feedEntry("Tumblr API - Degraded Performance"),
      feedEntry("Tumblr Dashboard - Operational"),
      feedEntry("Tumblr Sites - Operational"),
    ],
    fetchedAt: new Date().toISOString(),
  };
  const out = service.check!({ feed }, { fetch: () => Promise.reject(), log: () => {} } as never);
  const report = out as { state: string; message?: string };
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("Tumblr API"), true, report.message);
});

Deno.test("service.check: unknown when the feed failed to load", () => {
  const out = service.check!(
    { feed: { entries: [], latest: [], fetchedAt: new Date().toISOString(), error: "timeout" } },
    { fetch: () => Promise.reject(), log: () => {} } as never,
  );
  assertEquals((out as { state: string }).state, "unknown");
});

Deno.test("service.check: unknown, never ok, when no entry names a Tumblr component", () => {
  const feed = {
    entries: [],
    latest: [feedEntry("WordPress.com - Operational"), feedEntry("Gravatar - Operational")],
    fetchedAt: new Date().toISOString(),
  };
  const out = service.check!({ feed }, { fetch: () => Promise.reject(), log: () => {} } as never);
  assertEquals((out as { state: string }).state, "unknown");
});
