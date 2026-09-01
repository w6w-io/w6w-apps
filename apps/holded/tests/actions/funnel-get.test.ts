import { assertEquals } from "@std/assert";
import funnelGet from "../../actions/funnel-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("funnel-get: metadata", () => {
  assertEquals(funnelGet.key, "funnel-get");
  assertEquals(funnelGet.type, "read");
});

Deno.test("funnel-get: GET /funnels/{funnelId}, returns the object verbatim", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "f1", name: "Marketing", stages: [] },
  }]);
  const result = await funnelGet.execute({ funnelId: "f1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/funnels/f1");
  assertEquals(result, { id: "f1", name: "Marketing", stages: [] });
});

Deno.test("funnel-get: escapes a funnelId with path-breaking characters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "x" } }]);
  await funnelGet.execute({ funnelId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/funnels/a%2Fb");
});
