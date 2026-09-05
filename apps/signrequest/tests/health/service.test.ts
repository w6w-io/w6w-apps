import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (components: Array<{ name: string; status: string }>) => ({
  status: { indicator: "none", description: "All Systems Operational" },
  components,
});

Deno.test("check: reports ok when the API component is operational", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([{ name: "API", status: "operational" }, {
      name: "Web app",
      status: "operational",
    }]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("check: reports down when the API component has a major outage", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([{ name: "API", status: "major_outage" }]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("check: a degraded secondary component (Workers) caps at degraded, not down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([
      { name: "API", status: "operational" },
      { name: "Workers", status: "major_outage" },
    ]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("check: falls back to the page-wide rollup when no API component is found", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: { indicator: "major", description: "Partial outage" }, components: [] },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("check: reports unknown, not down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
