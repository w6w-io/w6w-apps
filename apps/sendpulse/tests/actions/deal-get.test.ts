import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-get.ts";

Deno.test("deal-get: hits GET /crm/v1/deals/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 9 } } }]);
  const result = await action.execute!({ dealId: 9 }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/deals/9");
  assertEquals(result, { data: { id: 9 } });
});
