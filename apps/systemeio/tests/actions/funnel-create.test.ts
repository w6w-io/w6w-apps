import { assertEquals } from "@std/assert";
import funnelCreate from "../../actions/funnel-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("funnel-create: POSTs {name} to /api/funnels", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: 1, name: "Launch", isActive: false },
  }]);
  const out = await funnelCreate.execute({ name: "Launch" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/funnels");
  assertEquals(JSON.parse(calls[0].body!), { name: "Launch" });
  assertEquals(out, { id: 1, name: "Launch", isActive: false });
});
