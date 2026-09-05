import { assert, assertEquals } from "@std/assert";
import service, { mapComponentStatus, TRACKED_COMPONENTS } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(
  components: Array<{ id: string; status: string }>,
  overrides: Record<string, unknown> = {},
) {
  return {
    page: { id: "sds4qb7v9tzy", name: "Manus", url: "https://status.manus.im" },
    components,
    incidents: [],
    status: { indicator: "none" },
    ...overrides,
  };
}

Deno.test("mapComponentStatus: maps Statuspage's vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: tracks exactly api.manus.im and manus computer", () => {
  assertEquals(Object.keys(TRACKED_COMPONENTS).sort(), ["lplkkmm75tn3", "r6pg5ktb00j5"]);
});

Deno.test("service: reports ok when both tracked components are operational", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "vtjj0hzp4gy8", status: "operational" }, // manus.im — excluded
      { id: "r6pg5ktb00j5", status: "operational" },
      { id: "lplkkmm75tn3", status: "operational" },
    ]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}).sort(), ["lplkkmm75tn3", "r6pg5ktb00j5"]);
});

Deno.test("service: a down excluded component (manus.im) does not affect the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "vtjj0hzp4gy8", status: "major_outage" },
      { id: "r6pg5ktb00j5", status: "operational" },
      { id: "lplkkmm75tn3", status: "operational" },
    ]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("service: a down tracked component reports down with a message", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "r6pg5ktb00j5", status: "major_outage" },
      { id: "lplkkmm75tn3", status: "operational" },
    ]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message?.includes("api.manus.im"), out.message);
});

Deno.test("service: an unreachable status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Manus reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary(
      [{ id: "r6pg5ktb00j5", status: "operational" }],
      { page: { id: "kt02l7r0j8rh", name: "manus", url: "https://manus.statuspage.io" } },
    ),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: only declares its own status host, not the app's API host", () => {
  assertEquals(service.network?.allow, ["status.manus.im"]);
  assertEquals(service.credential, "none");
});
