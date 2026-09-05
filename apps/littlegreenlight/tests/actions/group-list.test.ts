import { assertEquals } from "@std/assert";
import groupList from "../../actions/group-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("group-list: hits /api/v1/groups.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, name: "Board members" }]) }]);
  const out = await groupList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/groups.json");
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("group-list: pagination is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await groupList.execute({ limit: 5, offset: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { limit: "5", offset: "10" });
});
