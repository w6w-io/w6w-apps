import { assertEquals } from "@std/assert";
import householdDelete from "../../actions/household-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("household-delete: DELETEs /households/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await householdDelete.execute({ id: "1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/households/1");
  assertEquals(out, { status: 200 });
});
