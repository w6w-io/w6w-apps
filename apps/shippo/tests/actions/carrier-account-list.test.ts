import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/carrier-account-list.ts";

Deno.test("carrier-account-list: reads GET /carrier_accounts with pagination params", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: [{ object_id: "ca_1" }], next: null },
  }]);
  const result = await action.execute!({ results: 50 }, ctx) as { results: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/carrier_accounts");
  assertEquals(url.searchParams.get("results"), "50");
  assertEquals(result.results.length, 1);
});

Deno.test("carrier-account-list: is read-only", () => {
  assertEquals(action.type, "read");
});
