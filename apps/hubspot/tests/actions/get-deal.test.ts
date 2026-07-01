import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-deal.ts";

Deno.test("get-deal: GETs /crm/v3/objects/deals/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  const out = await action.execute!({ id: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/deals/d1");
  assertEquals((out as { id: string }).id, "d1");
});
