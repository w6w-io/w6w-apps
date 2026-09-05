import { assertEquals } from "@std/assert";
import groupGet from "../../actions/group-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-get: GETs /v2/groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "g1", title: "My Group" } } }]);
  const out = await groupGet.execute({ id: "g1" }, ctx) as { title: string };

  assertEquals(pathOf(calls[0].url), "/v2/groups/g1");
  assertEquals(out.title, "My Group");
});
