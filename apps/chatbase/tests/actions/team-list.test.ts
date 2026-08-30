import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-list: GET .../helpdesk/teams, bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "t1", isDefault: true, memberCount: 3 }] }]);
  const out = await teamList.execute({ agentId: "a1" }, ctx) as Array<{ isDefault: boolean }>;

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/teams");
  assertEquals(out[0].isDefault, true);
});
