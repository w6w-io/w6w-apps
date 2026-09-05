import { assertEquals } from "@std/assert";
import getGroup from "../../actions/get-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-group: GET /groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "g1", name: "Alumni", users: [] } }]);
  const out = await getGroup.execute({ groupID: "g1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v0/groups/g1");
  assertEquals(out.name, "Alumni");
});
