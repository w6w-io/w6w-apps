import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transaction-list.ts";

Deno.test("transaction-list: reads GET /transactions with pagination params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [], next: null } }]);
  await action.execute!({ results: 5, page: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/transactions");
  assertEquals(url.searchParams.get("results"), "5");
});

Deno.test("transaction-list: is read-only", () => {
  assertEquals(action.type, "read");
});
