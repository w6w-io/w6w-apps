import { assertEquals } from "@std/assert";
import funnelGet from "../../actions/funnel-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("funnel-get: fetches /api/funnels/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Launch", isActive: true } }]);
  const out = await funnelGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/funnels/1");
  assertEquals(out, { id: 1, name: "Launch", isActive: true });
});
