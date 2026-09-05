import { assertEquals } from "@std/assert";
import personsDelete from "../../actions/persons-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

Deno.test("persons-delete: DELETEs /persons/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await personsDelete.execute({ personId: 860197 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/persons/860197");
  assertEquals(out, { success: true });
});
