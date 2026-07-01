import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-deal.ts";

Deno.test("update-deal: PATCHes /crm/v3/objects/deals/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await action.execute!({ id: "d1", properties: { amount: 12000 } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/deals/d1");
});
