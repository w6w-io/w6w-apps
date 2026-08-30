import { assertEquals } from "@std/assert";
import tagUpdate from "../../actions/tag-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-update: PATCHes {title} to /tags/{tagId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { tag_id: "t1", title: "Renamed" } }]);
  await tagUpdate.execute({ tagId: "t1", title: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/tags/t1");
  assertEquals(JSON.parse(calls[0].body!), { title: "Renamed" });
});
