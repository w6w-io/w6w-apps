import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { listBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-list: reads GET /v1/tags", async () => {
  const { ctx, calls } = mockCtx([
    { body: listBody("tags", [{ id: 678, name: "General Inquiries", color: "#0662B5" }]) },
  ]);
  const out = await tagList.execute({}, ctx) as { items: Array<{ id: number }> };

  assertEquals(pathOf(calls[0].url), "/v1/tags");
  assertEquals(out.items[0].id, 678);
});
