import { assertEquals } from "@std/assert";
import tagGet from "../../actions/tag-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-get: fetches /api/tags/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "vip" } }]);
  const out = await tagGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/tags/1");
  assertEquals(out, { id: 1, name: "vip" });
});
