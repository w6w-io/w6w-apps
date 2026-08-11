import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-list: calls GET /api/teams", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, name: "Sales Team" }]) }]);
  const out = await teamList.execute({ page: 1 }, ctx) as { data: Array<{ name: string }> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/teams");
  assertEquals(queryOf(calls[0].url), { page: "1" });
  assertEquals(out.data[0].name, "Sales Team");
});
