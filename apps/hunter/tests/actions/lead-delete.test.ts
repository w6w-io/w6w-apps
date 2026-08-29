import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/lead-delete.ts";

Deno.test("lead-delete: DELETEs /leads/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { data: undefined });
});

Deno.test("lead-delete: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
