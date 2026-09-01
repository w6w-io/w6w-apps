import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-funds.ts";

Deno.test("list-funds: is a search action", () => {
  assertEquals(action.type, "search");
});

Deno.test("list-funds: GETs /funds with search/isActive/skip/take", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { Total: 1, TotalFiltered: 1, Start: 0, ResultCount: 1, Results: [] } },
  ]);
  await action.execute({ search: "General", isActive: true, skip: 0, take: 20 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/funds");
  assertEquals(url.searchParams.get("search"), "General");
  assertEquals(url.searchParams.get("isActive"), "true");
  assertEquals(url.searchParams.get("take"), "20");
});
