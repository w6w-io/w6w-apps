import { assertEquals } from "@std/assert";
import listGroups from "../../actions/list-groups.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-groups: GET /groups, wrapped under `groups`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "g1", name: "Alumni" }] }]);
  const out = await listGroups.execute({}, ctx) as { groups: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/groups");
  assertEquals(out.groups.length, 1);
});
