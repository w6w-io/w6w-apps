import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-get.ts";

Deno.test("opportunity-get: GETs /opportunities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunity: { id: 12 } } }]);
  const out = await action.execute({ opportunityId: 12 }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/opportunities/12");
  assertEquals(out, { opportunity: { id: 12 } });
});
