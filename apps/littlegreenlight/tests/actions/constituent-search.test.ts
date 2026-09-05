import { assertEquals } from "@std/assert";
import constituentSearch from "../../actions/constituent-search.ts";
import { envelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("constituent-search: hits /api/v1/constituents/search.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, first_name: "Brady" }]) }]);
  const out = await constituentSearch.execute({ filters: ["name=brady"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/constituents/search.json");
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("constituent-search: sends each filter as a repeated q[] clause", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await constituentSearch.execute({ filters: ["name=brady", "lgl_id=42"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "q[]"), ["name=brady", "lgl_id=42"]);
});

Deno.test("constituent-search: expand is comma-joined on the wire", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await constituentSearch.execute(
    { filters: ["name=brady"], expand: ["email_addresses", "groups"] },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).expand, "email_addresses,groups");
});

Deno.test("constituent-search: sortDescending appends ! to the sort field", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await constituentSearch.execute(
    { filters: ["name=brady"], sort: "name", sortDescending: true },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).sort, "name!");
});

Deno.test("constituent-search: an unset sort/expand is omitted from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await constituentSearch.execute({ filters: ["name=brady"] }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.sort, undefined);
  assertEquals(query.expand, undefined);
});

Deno.test("constituent-search: pagination is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await constituentSearch.execute({ filters: ["name=brady"], limit: 10, offset: 20 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.limit, "10");
  assertEquals(query.offset, "20");
});
