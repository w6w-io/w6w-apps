import { assertEquals } from "@std/assert";
import tagGet from "../../actions/tag-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-get: reads one tag", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "48892885", display_value: "Front Side" } }]);
  const tag = await tagGet.execute({ tagId: "48892885" }, ctx) as { display_value: string };
  assertEquals(pathOf(calls[0].url), "/v2/tags/48892885");
  assertEquals(tag.display_value, "Front Side");
});
