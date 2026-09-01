import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { mapComponentStatus, STATUS_URL } from "../../health/service.ts";

let seq = 0;
const group = (name: string) => ({ id: `g${++seq}`, name, group: true, status: "operational" });

interface ComponentSpec {
  region: string;
  name: string;
  status: string;
}

function page(specs: ComponentSpec[]) {
  const groups = new Map<string, ReturnType<typeof group>>();
  for (const s of specs) {
    if (!groups.has(s.region)) {
      groups.set(
        s.region,
        group(`${s.region} environment (app.${s.region.toLowerCase()}.pendo.io)`),
      );
    }
  }
  const components = specs.map((s, i) => ({
    id: `c${i}`,
    name: s.name,
    status: s.status,
    group: false,
    group_id: groups.get(s.region)!.id,
  }));
  return {
    status: 200,
    body: {
      page: { name: "Pendo" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [...groups.values(), ...components],
    },
  };
}

const allGood = page([
  { region: "US", name: "API", status: "operational" },
  { region: "US", name: "Analytics - Data Collection", status: "operational" },
  { region: "US", name: "Pendo UI", status: "operational" },
]);

Deno.test("service: reads the Statuspage summary unauthenticated", async () => {
  const { ctx, calls } = mockCtx([allGood]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
});

Deno.test("service: ignores components this app never calls, like Pendo UI or NPS", async () => {
  const { ctx } = mockCtx([
    page([
      { region: "US", name: "API", status: "operational" },
      { region: "US", name: "Pendo UI", status: "major_outage" },
      { region: "US", name: "NPS", status: "major_outage" },
    ]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("service: names the affected region and component", async () => {
  const { ctx } = mockCtx([
    page([
      { region: "EU", name: "API", status: "major_outage" },
      { region: "US", name: "API", status: "operational" },
    ]),
  ]);
  const result = await service.check!({}, ctx);
  assert(/EU API/.test(result.message!), result.message);
  assert(/only affected if it uses one of these regions/.test(result.message!), result.message);
});

/** App-scoped: cannot know which region(s) a Connection uses, so a single region's outage never reports fully down. */
Deno.test("service: a major outage in one region is capped at degraded", async () => {
  const { ctx } = mockCtx([page([{ region: "JPN", name: "API", status: "major_outage" }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: mapComponentStatus covers the Atlassian vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});
