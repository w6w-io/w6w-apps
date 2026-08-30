import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-items.ts";

Deno.test("list-items: GETs {site}/lists/{list-id}/items", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "1" }] } }]);
  const out = await action.execute({ listId: "L1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/lists/L1/items");
  assertEquals(out.value, [{ id: "1" }]);
});

Deno.test("list-items: expands `fields` by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ listId: "L1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), "fields");
});

Deno.test("list-items: Columns narrows the expand to fields(select=...)", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ listId: "L1", columns: ["Title", "Author"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), "fields(select=Title,Author)");
});

Deno.test("list-items: turning off Expand column values drops $expand entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ listId: "L1", expandFields: false, columns: ["Title"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), null);
});

Deno.test("list-items: $filter rides as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ listId: "L1", filter: "fields/Color eq 'Purple'" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$filter"), "fields/Color eq 'Purple'");
});

Deno.test("list-items: a nextLink is replayed verbatim", async () => {
  const nextLink = "https://graph.microsoft.com/v1.0/sites/root/lists/L1/items?$skiptoken=a";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ listId: "L1", nextLink, filter: "ignored" }, ctx);
  assertEquals(calls[0].url, nextLink);
});

Deno.test("list-items: Fetch all pages walks @odata.nextLink up to the page cap", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        value: [{ id: "1" }],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/sites/root/lists/L1/items?$skiptoken=a",
      },
    },
    { body: { value: [{ id: "2" }] } },
  ]);
  const out = await action.execute({ listId: "L1", all: true, maxPages: 5 }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.map((i) => i.id), ["1", "2"]);
});

Deno.test("list-items: offers no $filter param shape other than a raw string — never a builder", () => {
  const filterParam = action.params!.find((p) => p.key === "filter")!;
  assertEquals(filterParam.type, "string");
});
