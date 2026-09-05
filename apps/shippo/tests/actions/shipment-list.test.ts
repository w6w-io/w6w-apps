import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-list.ts";

Deno.test("shipment-list: reads GET /shipments with pagination params", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: [{ object_id: "shp_1" }], next: null },
  }]);
  const result = await action.execute!({ results: 10, page: 2 }, ctx) as { results: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/shipments");
  assertEquals(url.searchParams.get("results"), "10");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(result.results.length, 1);
});

Deno.test("shipment-list: is read-only and offers paging params", () => {
  assertEquals(action.type, "read");
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assertEquals(keys, ["results", "page"]);
});
