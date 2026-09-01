import { assertEquals } from "@std/assert";
import planList from "../../actions/plan-list.ts";
import { collection, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("plan-list: lists /plans", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "plan_1" }]) }]);
  const out = await planList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/plans");
  assertEquals(out, collection([{ id: "plan_1" }]));
});
