import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/milestone-list.ts";

Deno.test("milestone-list: GETs /projects/api/v3/milestones.json with filters", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { milestones: [] } }]);
  await action.execute({ dueBefore: "2026-12-31" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/projects/api/v3/milestones.json");
  assertEquals(url.searchParams.get("dueBefore"), "2026-12-31");
});
