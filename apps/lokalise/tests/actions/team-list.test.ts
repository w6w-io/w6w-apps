import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-list: lists teams with plan and quota information", async () => {
  const { ctx, calls } = mockCtx([
    { body: { teams: [{ team_id: 1, name: "Acme", plan: "Essential" }] } },
  ]);
  const out = await teamList.execute({ limit: 50 }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api2/teams");
  assertEquals(out.items, [{ team_id: 1, name: "Acme", plan: "Essential" }]);
});
