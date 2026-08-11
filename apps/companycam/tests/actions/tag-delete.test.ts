import { assertEquals } from "@std/assert";
import tagDelete from "../../actions/tag-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-delete: DELETEs and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await tagDelete.execute({ tagId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/tags/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
