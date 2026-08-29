import { assert, assertEquals } from "@std/assert";
import service, { apiComponents, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: unknown[], opts: Record<string, unknown> = {}) {
  return {
    page: { id: "h8hwp7pfmmrz", name: "Pinterest", url: "https://www.pintereststatus.com" },
    components,
    incidents: [],
    status: { indicator: "none" },
    ...opts,
  };
}

const API_GROUP = { id: "grp-api", name: "The Pinterest API", group: true };
const WEBSITE_GROUP = { id: "grp-web", name: "Sign up and login", group: true };

Deno.test('apiComponents: keeps only children of "The Pinterest API" group', () => {
  const components = [
    API_GROUP,
    WEBSITE_GROUP,
    { id: "a", name: "Content and Core Endpoints", status: "operational", group_id: "grp-api" },
    { id: "b", name: "Personal login", status: "operational", group_id: "grp-web" },
  ];
  const out = apiComponents(components);
  assertEquals(out.map((c) => c.id), ["a"]);
});

Deno.test("apiComponents: returns empty when the API group is missing", () => {
  assertEquals(apiComponents([WEBSITE_GROUP]), []);
});

Deno.test("mapComponentStatus: maps the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: reports ok when every API component is operational", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: summary([
        API_GROUP,
        { id: "a", name: "Content and Core Endpoints", status: "operational", group_id: "grp-api" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
});

Deno.test("service: reports the worst API component, not the page-level indicator", async () => {
  // Page-level indicator says "none" (see `summary()`), but the one API
  // component that matters is down — a website-only incident must never mask
  // an actual API outage, and an API outage must never be masked by an
  // unrelated website incident either.
  const { ctx } = mockCtx([
    {
      body: summary([
        API_GROUP,
        {
          id: "a",
          name: "Content and Core Endpoints",
          status: "major_outage",
          group_id: "grp-api",
        },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a website-only incident does not affect the verdict", async () => {
  const { ctx } = mockCtx([
    {
      body: summary([
        API_GROUP,
        WEBSITE_GROUP,
        { id: "a", name: "Content and Core Endpoints", status: "operational", group_id: "grp-api" },
        { id: "b", name: "Personal login", status: "major_outage", group_id: "grp-web" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(!Object.keys(report.components ?? {}).includes("b"));
});

Deno.test("service: reports unknown, not down, on a broken status page", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: reports unknown when the page no longer self-identifies as Pinterest's", async () => {
  const { ctx } = mockCtx([{ body: { page: { url: "https://example.com" }, components: [] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is unsigned — status hosts never see the access token", () => {
  assertEquals(service.credential, "none");
});
