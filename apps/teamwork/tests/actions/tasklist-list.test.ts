import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/tasklist-list.ts";

Deno.test("tasklist-list: GETs /projects/api/v3/tasklists with NO .json suffix", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { tasklists: [] } }]);
  await action.execute({ projectIds: "1,2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/projects/api/v3/tasklists");
  assertEquals(url.searchParams.get("projectIds"), "1,2");
});
