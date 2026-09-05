import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-delete.ts";

Deno.test("opportunity-delete: DELETEs /Opportunities/{id}", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 202, body: undefined }]);
  const out = await action.execute({ opportunityId: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Opportunities/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
