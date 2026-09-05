import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-list: calls GET /1/Tags", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ tag_id: "1", tag_name: "VIP" }]) }]);
  const out = await tagList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1/Tags");
  assertEquals(out.items.length, 1);
});
