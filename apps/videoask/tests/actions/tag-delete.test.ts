import { assertEquals } from "@std/assert";
import tagDelete from "../../actions/tag-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-delete: DELETEs /tags/{tagId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await tagDelete.execute({ tagId: "t1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/tags/t1");
  assertEquals(out.status, 204);
});
