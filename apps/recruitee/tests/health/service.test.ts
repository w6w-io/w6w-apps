import { assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  recruiteeComponents,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtxNoConnection } from "../_helpers.ts";

const PAGE = { id: "bf6k4jctcdck", name: "Tellent", url: "https://status.tellent.com" };

function summary(components: Array<Record<string, unknown>>) {
  return { page: PAGE, components };
}

Deno.test("recruiteeComponents: keeps only children of the page's own 'Tellent Recruitee' group", () => {
  const components = [
    { id: "g1", name: "Tellent Recruitee", group: true },
    { id: "a", name: "Recruitee API", group_id: "g1" },
    { id: "b", name: "Recruitee Website", group_id: "g1" },
    { id: "g2", name: "Tellent HR", group: true },
    { id: "c", name: "Tellent HR API", group_id: "g2" },
    { id: "d", name: "Infrastructure Providers", group: true },
  ];
  const kept = recruiteeComponents(components);
  assertEquals(kept.map((c) => c.id).sort(), ["a", "b"]);
});

Deno.test("recruiteeComponents: an unrecognisable page structure yields nothing, not everything", () => {
  const components = [{ id: "x", name: "Something Else", group_id: null }];
  assertEquals(recruiteeComponents(components), []);
});

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: reports ok when every Recruitee-group component is operational", async () => {
  const { ctx, calls } = mockCtxNoConnection([
    {
      status: 200,
      body: summary([
        { id: "g1", name: "Tellent Recruitee", group: true },
        { id: "a", name: "Recruitee API", status: "operational", group_id: "g1" },
        { id: "b", name: "Recruitee Website", status: "operational", group_id: "g1" },
        { id: "c", name: "Tellent HR API", status: "major_outage", group_id: "g2" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  // An outage on the unrelated Tellent HR group must not affect the verdict.
  assertEquals(report.state, "ok");
});

Deno.test("service: an outage inside the Recruitee group is reported", async () => {
  const { ctx } = mockCtxNoConnection([
    {
      status: 200,
      body: summary([
        { id: "g1", name: "Tellent Recruitee", group: true },
        { id: "a", name: "Recruitee API", status: "major_outage", group_id: "g1" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("Recruitee API"), true);
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtxNoConnection([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a missing Recruitee group is unknown, not a silent ok", async () => {
  const { ctx } = mockCtxNoConnection([
    { status: 200, body: summary([{ id: "g2", name: "Tellent HR", group: true }]) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a rebrand/redirect to a different page is unknown, not trusted", async () => {
  const { ctx } = mockCtxNoConnection([
    {
      status: 200,
      body: {
        page: { id: "x", name: "Someone Else", url: "https://status.example.com" },
        components: [{ id: "g1", name: "Tellent Recruitee", group: true }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is unsigned and only widens egress to the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.tellent.com"]);
});
