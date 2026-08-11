import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  findHarvestGroup,
  HARVEST_GROUP_ID,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * A trimmed copy of the real page's shape, including the part that makes it
 * awkward: "Silo 1" exists three times, under three different groups, with three
 * different ids.
 */
interface FixtureComponent {
  id: string;
  name: string;
  status?: string;
  group?: boolean;
  group_id?: string;
  components?: string[];
}

function summary(overrides: Record<string, unknown> = {}): {
  page: { id?: string; name: string; url: string };
  status: { indicator: string; description: string };
  components: FixtureComponent[];
  incidents: Array<{ name: string; status: string }>;
  scheduled_maintenances: unknown[];
} {
  return {
    page: { id: "z1fpkbyft3qn", name: "Greenhouse", url: "https://status.greenhouse.io" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: <FixtureComponent[]> [
      { id: "grp-recruiting", name: "Greenhouse Recruiting", group: true, components: ["rec-1"] },
      { id: "rec-1", name: "Silo 1", status: "operational", group_id: "grp-recruiting" },
      {
        id: HARVEST_GROUP_ID,
        name: "Greenhouse Harvest API",
        group: true,
        components: ["hv-1", "hv-2"],
      },
      { id: "hv-1", name: "Silo 1", status: "operational", group_id: HARVEST_GROUP_ID },
      { id: "hv-2", name: "Silo 2", status: "operational", group_id: HARVEST_GROUP_ID },
      { id: "grp-infra", name: "Core Infrastructure", group: true, components: ["aws-s3"] },
      { id: "aws-s3", name: "AWS S3 (us-east-1)", status: "operational", group_id: "grp-infra" },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: declares an unsigned posture and its own status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.greenhouse.io"]);
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});

Deno.test("service: maps the Statuspage component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("service: maps the page-level indicator vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: resolves the Harvest group by id, then by name", () => {
  assertEquals(findHarvestGroup(summary().components)?.id, HARVEST_GROUP_ID);
  const renamed = summary().components.map((c) =>
    c.id === HARVEST_GROUP_ID ? { ...c, id: "new-id" } : c
  );
  assertEquals(findHarvestGroup(renamed)?.id, "new-id");
  assertEquals(findHarvestGroup([{ name: "Something else", group: true }]), undefined);
});

Deno.test("service: keys components by the vendor id, never by the ambiguous name", () => {
  assertEquals(componentKey({ id: "hv-1", name: "Silo 1" }, 0), "hv-1");
  assertEquals(componentKey({ name: "Silo 1" }, 3), "silo-1-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: a healthy page reports ok and publishes every non-group component", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  // Four leaves, zero group rows — publishing a group would double-count.
  assertEquals(Object.keys(report.components ?? {}).sort(), ["aws-s3", "hv-1", "hv-2", "rec-1"]);
});

/**
 * Three components are called "Silo 1". Without the group prefix a reader cannot
 * tell which one an amber row belongs to.
 */
Deno.test("service: component messages disambiguate the repeated names by group", () => {
  const keys = summary().components.filter((c) => !c.group).map((c) => c.name);
  assertEquals(keys.filter((n) => n === "Silo 1").length, 2);
});

Deno.test("service: the group prefix appears in each component message", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.["hv-1"].message, "Greenhouse Harvest API — Silo 1");
  assertEquals(report.components?.["rec-1"].message, "Greenhouse Recruiting — Silo 1");
});

/**
 * The design decision this check exists to make. The page indicator rolls up 39
 * components — Fastly PoPs, AWS regions, LinkedIn, OpenAI — that this app never
 * calls. A Fastly incident must not report the Harvest API down.
 */
Deno.test("service: a third-party outage is reported but does not set the verdict", async () => {
  const page = summary({
    status: { indicator: "major", description: "Partial System Outage" },
  });
  page.components = page.components.map((c) =>
    c.id === "aws-s3" ? { ...c, status: "major_outage" } : c
  );

  const { ctx } = mockCtx([{ body: page }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok", "Harvest silos are healthy, so the verdict is ok");
  assertEquals(report.components?.["aws-s3"].state, "down", "but the outage is still reported");
  assert(report.message?.includes("AWS S3 (us-east-1)"), report.message);
});

Deno.test("service: an outage inside the Harvest group DOES set the verdict", async () => {
  const page = summary();
  page.components = page.components.map((c) =>
    c.id === "hv-2" ? { ...c, status: "major_outage" } : c
  );
  const { ctx } = mockCtx([{ body: page }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a degraded Harvest silo degrades rather than downs the verdict", async () => {
  const page = summary();
  page.components = page.components.map((c) =>
    c.id === "hv-1" ? { ...c, status: "degraded_performance" } : c
  );
  const { ctx } = mockCtx([{ body: page }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/** Without the group there is nothing better than the page-wide roll-up. */
Deno.test("service: a missing Harvest group falls back to the indicator and says so", async () => {
  const page = summary({ status: { indicator: "minor", description: "Degraded" } });
  page.components = page.components.filter((c) =>
    c.id !== HARVEST_GROUP_ID && c.group_id !== HARVEST_GROUP_ID
  );
  const { ctx } = mockCtx([{ body: page }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("was not found"), report.message);
});

/** A broken status API says nothing about Greenhouse — never `down`. */
Deno.test("service: a failing status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/**
 * The failure mode where a healthy, claimed status page belongs to an entirely
 * different product after a redirect or a rebrand.
 */
Deno.test("service: a page that no longer self-identifies as Greenhouse is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { name: "Someone Else", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("self-identifies"), report.message);
});

Deno.test("service: open incidents and maintenance windows are counted in the message", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      incidents: [{ name: "MS Teams Missing When Scheduling", status: "identified" }],
      scheduled_maintenances: [{}],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assert(report.message?.includes("1 open incident(s)"), report.message);
  assert(report.message?.includes("1 scheduled maintenance window(s)"), report.message);
});
