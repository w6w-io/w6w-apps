import { assertEquals } from "@std/assert";
import listsList from "../../actions/lists-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lists-list: calls GET /lists with no query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "My List" }] }]);
  const out = await listsList.execute({}, ctx) as Array<{ name: string }>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/lists");
  assertEquals(out[0].name, "My List");
});
