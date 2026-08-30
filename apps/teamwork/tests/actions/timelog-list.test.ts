import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/timelog-list.ts";

Deno.test("timelog-list: GETs /projects/api/v3/time.json using the non-deprecated array filters", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { timelogs: [] } }]);
  await action.execute({ projectId: 42, taskId: 9 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/projects/api/v3/time.json");
  assertEquals(url.searchParams.get("projectIds"), "42");
  assertEquals(url.searchParams.get("taskIds"), "9");
});
