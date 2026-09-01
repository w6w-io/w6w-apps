import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/expense-list.ts";

Deno.test("expense-list: GETs /expenses, turning projectId into a full resource URL", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { expenses: [] } }]);
  await action.execute({ projectId: "3", fromDate: "2026-01-01", toDate: "2026-03-31" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/expenses");
  assertEquals(url.searchParams.get("project"), "https://api.freeagent.com/v2/projects/3");
  assertEquals(url.searchParams.get("from_date"), "2026-01-01");
  assertEquals(url.searchParams.get("to_date"), "2026-03-31");
});
