import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: OPERATIONAL 'folk rest API' component reports ok", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      components: [
        { id: "1", name: "folk website", status: "OPERATIONAL" },
        { id: "2", name: "folk rest API", status: "OPERATIONAL" },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://folk.instatus.com/components.json");
  assertEquals(out.state, "ok");
});

Deno.test("service: finds the component nested under a group's children", async () => {
  const { ctx } = mockCtx([{
    body: {
      components: [
        {
          id: "grp",
          name: "folk application",
          status: "OPERATIONAL",
          children: [{ id: "2", name: "folk rest API", status: "MAJOROUTAGE" }],
        },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.components?.api.state, "down");
});

Deno.test("service: a PARTIALOUTAGE component reports degraded", async () => {
  const { ctx } = mockCtx([{
    body: { components: [{ id: "2", name: "folk rest API", status: "PARTIALOUTAGE" }] },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("service: missing component reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ body: { components: [] } }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: a failed status API call reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
