import { assertEquals } from "@std/assert";
import listDelete from "../../actions/list-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-delete: DELETEs /lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await listDelete.execute({ id: 715 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/lists/715");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
