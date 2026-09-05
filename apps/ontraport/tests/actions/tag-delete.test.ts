import { assertEquals } from "@std/assert";
import tagDelete from "../../actions/tag-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-delete: calls DELETE /1/Tag?id=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  const out = await tagDelete.execute({ id: "1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/1/Tag");
  assertEquals(queryOf(calls[0].url), { id: "1" });
  assertEquals(out.deleted, true);
});
