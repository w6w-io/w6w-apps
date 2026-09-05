import { assertEquals } from "@std/assert";
import tagRemove from "../../actions/tag-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-remove: calls DELETE /1/objects/tagByName as JSON, defaulting to Contact", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  await tagRemove.execute({ ids: "2", tagNames: "Blue,Yellow" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/1/objects/tagByName");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.objectID, 0);
  assertEquals(body.ids, [2]);
  assertEquals(body.remove_names, ["Blue", "Yellow"]);
});
