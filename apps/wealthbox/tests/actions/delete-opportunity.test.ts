import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-opportunity.ts";

Deno.test("delete-opportunity: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("delete-opportunity: DELETEs /opportunities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ opportunityId: 3 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/opportunities/3");
  assertEquals(result, {});
});
