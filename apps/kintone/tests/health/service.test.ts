import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reports ok when the Availability component is operational", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      page: { name: "Kintone", id: "53bp49z7s2n7" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ id: "x", name: "Availability", status: "operational" }],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://status.kintone.com/api/v2/summary.json");
});

Deno.test("service: reports down on a major_outage", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { name: "Kintone", id: "x" },
      status: { indicator: "critical", description: "Major outage" },
      components: [{ id: "x", name: "Availability", status: "major_outage" }],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("service: falls back to the page indicator if the Availability component is renamed away", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { name: "Kintone", id: "x" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ id: "x", name: "Something Else", status: "operational" }],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("service: reports unknown on an unreachable status page", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: reports unknown when the page identity does not match", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { page: { name: "Not Kintone" }, components: [] },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
