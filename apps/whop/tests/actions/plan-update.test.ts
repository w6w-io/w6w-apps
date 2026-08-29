import { assertEquals } from "@std/assert";
import planUpdate from "../../actions/plan-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("plan-update: PATCHes only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plan_1" } }]);
  await planUpdate.execute({ planId: "plan_1", renewalPrice: 79 }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/plans/plan_1");
  assertEquals(JSON.parse(calls[0].body!), { renewal_price: 79 });
});
