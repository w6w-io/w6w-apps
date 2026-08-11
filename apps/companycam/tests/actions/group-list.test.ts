import { assertEquals } from "@std/assert";
import groupList from "../../actions/group-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-list: lists groups with their embedded members", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "1", name: "The Psych Crew", users: [{ id: "9" }] }],
  }]);
  const page = await groupList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/groups");
  assertEquals((page.items[0] as { users: unknown[] }).users.length, 1);
});
