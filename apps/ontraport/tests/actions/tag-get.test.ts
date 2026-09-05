import { assertEquals } from "@std/assert";
import tagGet from "../../actions/tag-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-get: calls GET /1/Tag?id=...", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ tag_id: "1", tag_name: "Contact Tags" }) }]);
  const out = await tagGet.execute({ id: "1" }, ctx) as { tag_name: string };

  assertEquals(pathOf(calls[0].url), "/1/Tag");
  assertEquals(queryOf(calls[0].url), { id: "1" });
  assertEquals(out.tag_name, "Contact Tags");
});
