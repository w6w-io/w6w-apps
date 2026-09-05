import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

function summary(apiStatus: string): Record<string, unknown> {
  return {
    page: { name: "Planning Center" },
    components: [
      { id: "sj9pmr5xnh0r", name: "API", status: apiStatus },
      { id: "b5908g898mj4", name: "People", status: "operational" },
    ],
  };
}

Deno.test("service: calls the real Statuspage summary endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.planningcenter.com/api/v2/summary.json");
  assertEquals(pathOf(calls[0].url), "/api/v2/summary.json");
});

Deno.test("service: operational -> ok", async () => {
  const { ctx } = mockCtx([{ body: summary("operational") }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("service: major_outage -> down", async () => {
  const { ctx } = mockCtx([{ body: summary("major_outage") }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("service: degraded_performance -> degraded, with a message", async () => {
  const { ctx } = mockCtx([{ body: summary("degraded_performance") }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assertEquals(out.message?.includes("API"), true);
});

Deno.test("service: only reads the API component, not the page's worst component", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { name: "Planning Center" },
        components: [
          { id: "sj9pmr5xnh0r", name: "API", status: "operational" },
          { id: "other", name: "Church Center", status: "major_outage" },
        ],
      },
    },
  ]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("service: a non-ok status response is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: undefined }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
