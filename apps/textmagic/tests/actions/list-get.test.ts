import { assertEquals } from "@std/assert";
import listGet from "../../actions/list-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-get: GETs /lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 715, name: "Private list" } }]);
  const out = await listGet.execute({ id: 715 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/lists/715");
  assertEquals(out, { id: 715, name: "Private list" });
});
