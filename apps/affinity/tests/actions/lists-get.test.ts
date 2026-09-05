import { assertEquals } from "@std/assert";
import listsGet from "../../actions/lists-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lists-get: calls GET /lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 450, name: "My List of People" } }]);
  const out = await listsGet.execute({ listId: 450 }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/lists/450");
  assertEquals(out.name, "My List of People");
});
