import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-transactions.ts";

Deno.test("list-transactions: is a search action", () => {
  assertEquals(action.type, "search");
});

Deno.test("list-transactions: GETs /transactions with the documented filters", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { Total: 0, TotalFiltered: 0, Start: 0, ResultCount: 0, Results: [] } },
  ]);
  await action.execute({
    accountId: 5,
    type: "Donation",
    minAmount: 10,
    maxAmount: 100,
    lastModified: "2026-01-01T00:00:00Z",
    skip: 0,
    take: 25,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/transactions");
  assertEquals(url.searchParams.get("accountId"), "5");
  assertEquals(url.searchParams.get("type"), "Donation");
  assertEquals(url.searchParams.get("minAmount"), "10");
  assertEquals(url.searchParams.get("maxAmount"), "100");
  assertEquals(url.searchParams.get("lastModified"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("take"), "25");
});
