import { assertEquals } from "@std/assert";
import groupUpdate from "../../actions/group-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-update: PATCHes /v2/groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Group updated!" } }]);
  await groupUpdate.execute({ id: "g1", title: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/groups/g1");
  assertEquals(JSON.parse(calls[0].body!), { title: "Renamed" });
});
