import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-constituents.ts";

Deno.test("search-constituents: is a search action", () => {
  assertEquals(action.type, "search");
});

Deno.test("search-constituents: GETs /constituents/search with search/type/skip/take", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { Total: 1, TotalFiltered: 1, Start: 0, ResultCount: 1, Results: [] } },
  ]);
  await action.execute({ search: "Bob Smith", type: "Individual", skip: 0, take: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/constituents/search");
  assertEquals(url.searchParams.get("search"), "Bob Smith");
  assertEquals(url.searchParams.get("type"), "Individual");
  assertEquals(url.searchParams.get("skip"), "0");
  assertEquals(url.searchParams.get("take"), "10");
});

Deno.test("search-constituents: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { Total: 0, TotalFiltered: 0, Start: 0, ResultCount: 0, Results: [] } },
  ]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("search"), false);
  assertEquals(url.searchParams.has("type"), false);
});
