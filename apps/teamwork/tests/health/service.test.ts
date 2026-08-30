import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const components = (overrides: Partial<{ group: string; us: string; eu: string }> = {}) => ({
  components: [
    {
      id: "group",
      name: "Teamwork Projects",
      status: overrides.group ?? "operational",
      group_id: null,
    },
    {
      id: "us",
      name: "Teamwork Projects - US region",
      status: overrides.us ?? "operational",
      group_id: "group",
    },
    {
      id: "eu",
      name: "Teamwork Projects - EU Region",
      status: overrides.eu ?? "operational",
      group_id: "group",
    },
    { id: "desk", name: "Teamwork Desk - US Region", status: "major_outage", group_id: "desk-g" },
  ],
});

Deno.test("service: reports ok when the Teamwork Projects group is operational", async () => {
  const { ctx } = mockCtx([{ body: components() }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("service: ignores an outage in an unrelated product (Desk)", async () => {
  const { ctx } = mockCtx([{ body: components() }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals("desk" in (out.components ?? {}), false);
});

Deno.test("service: reports down when the Teamwork Projects group itself is down", async () => {
  const { ctx } = mockCtx([{ body: components({ group: "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("service: reports each region under `components`", async () => {
  const { ctx } = mockCtx([{ body: components({ us: "degraded_performance" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.components?.["teamwork-projects-us-region"]?.state, "degraded");
  assertEquals(out.components?.["teamwork-projects-eu-region"]?.state, "ok");
});

Deno.test("service: unknown (never down) when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: unknown when the Teamwork Projects group is missing from the feed", async () => {
  const { ctx } = mockCtx([{ body: { components: [] } }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
