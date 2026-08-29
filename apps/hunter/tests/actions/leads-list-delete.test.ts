import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/leads-list-delete.ts";

Deno.test("leads-list-delete: DELETEs /leads_lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads_lists/1");
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("leads-list-delete: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
