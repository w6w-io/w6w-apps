import { assertEquals } from "@std/assert";
import groupGet from "../../actions/group-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-get: reads one group", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3992883", name: "The Psych Crew" } }]);
  const group = await groupGet.execute({ groupId: "3992883" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/v2/groups/3992883");
  assertEquals(group.name, "The Psych Crew");
});
