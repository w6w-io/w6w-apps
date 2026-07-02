import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-records.ts";

Deno.test("search-records: sends defaults (pageSize=100)", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [], offset: undefined } }]);
  await action.execute!({ baseId: "appABC", table: "Users" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/appABC/Users");
  assertEquals(url.searchParams.get("pageSize"), "100");
});

Deno.test("search-records: forwards filter, view, fields[] and offset", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute!(
    {
      baseId: "appABC",
      table: "Users",
      filterByFormula: "NOT({Name} = '')",
      view: "Grid view",
      fields: ["Name", "Email"],
      offset: "cursor-1",
      pageSize: 25,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filterByFormula"), "NOT({Name} = '')");
  assertEquals(url.searchParams.get("view"), "Grid view");
  assertEquals(url.searchParams.get("pageSize"), "25");
  assertEquals(url.searchParams.get("offset"), "cursor-1");
  assertEquals(url.searchParams.getAll("fields[]"), ["Name", "Email"]);
});

Deno.test("search-records: flattens sort into sort[i][field]/sort[i][direction]", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute!(
    {
      baseId: "appABC",
      table: "Users",
      sort: [
        { field: "Name", direction: "asc" },
        { field: "Age", direction: "desc" },
      ],
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sort[0][field]"), "Name");
  assertEquals(url.searchParams.get("sort[0][direction]"), "asc");
  assertEquals(url.searchParams.get("sort[1][field]"), "Age");
  assertEquals(url.searchParams.get("sort[1][direction]"), "desc");
});

Deno.test("search-records: omits filter when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute!({ baseId: "appABC", table: "Users" }, ctx);
  const url = new URL(calls[0].url);
  assert(!url.searchParams.has("filterByFormula"));
  assert(!url.searchParams.has("view"));
  assert(!url.searchParams.has("offset"));
});

Deno.test("search-records: returns the envelope including offset for cursor pagination", async () => {
  const { ctx } = mockCtx([{ body: { records: [{ id: "rec1" }], offset: "next-cursor" } }]);
  const result = await action.execute!({ baseId: "appABC", table: "Users" }, ctx);
  assertEquals(result.records?.length, 1);
  assertEquals(result.offset, "next-cursor");
});
