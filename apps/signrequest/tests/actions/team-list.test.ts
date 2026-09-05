import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-list: GETs /teams/", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { count: 1, results: [{ name: "Acme" }] },
  }]);
  const out = await teamList.execute({}, ctx) as { count: number };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/api/v1/teams/");
  assertEquals(out.count, 1);
});
