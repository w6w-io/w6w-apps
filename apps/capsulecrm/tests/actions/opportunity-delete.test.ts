import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-delete.ts";

Deno.test("opportunity-delete: DELETEs /opportunities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ opportunityId: 12 }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/opportunities/12");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
