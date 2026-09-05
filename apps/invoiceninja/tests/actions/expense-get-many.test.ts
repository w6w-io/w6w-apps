import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/expense-get-many.ts";

Deno.test("expense-get-many: GETs /expenses with pagination only", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await action.execute({ page: 1, perPage: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/expenses");
  assertEquals(url.searchParams.get("per_page"), "2");
});
