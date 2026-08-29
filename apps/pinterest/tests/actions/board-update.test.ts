import { assertEquals } from "@std/assert";
import boardUpdate from "../../actions/board-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("board-update: PATCHes /boards/{id} with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "New name", privacy: "SECRET" } }]);
  const out = await boardUpdate.execute({ boardId: "1", name: "New name" }, ctx) as {
    name: string;
  };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v5/boards/1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New name" });
  assertEquals(out.name, "New name");
});

Deno.test("board-update: omits unset fields from the body entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await boardUpdate.execute({ boardId: "1", privacy: "PUBLIC" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { privacy: "PUBLIC" });
});
