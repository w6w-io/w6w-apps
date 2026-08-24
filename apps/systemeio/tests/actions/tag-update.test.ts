import { assertEquals } from "@std/assert";
import tagUpdate from "../../actions/tag-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-update: PUTs {name} to /api/tags/{id} as application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "renamed" } }]);
  await tagUpdate.execute({ id: "1", name: "renamed" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/tags/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "renamed" });
});
