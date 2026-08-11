import { assertEquals, assertRejects } from "@std/assert";
import itemFilter from "../../actions/item-filter.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const PAGE = {
  total: 4218,
  filtered: 2,
  items: [
    { item_id: 9, title: "Acme", push: { signature: "s" } },
    { item_id: 10, title: "Beta" },
  ],
};

Deno.test("item-filter: POSTs to the filter endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await itemFilter.execute({ appId: "123" }, ctx);
  assertEquals(pathOf(calls[0].url), "/item/app/123/filter/");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, {
    items: [{ item_id: 9, title: "Acme" }, { item_id: 10, title: "Beta" }],
    total: 4218,
    filtered: 2,
  });
});

Deno.test("item-filter: an empty request sends an empty body, not nulls", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await itemFilter.execute({ appId: "123" }, ctx);
  assertEquals(bodyOf(calls[0]), {});
});

Deno.test("item-filter: every documented body field maps to its snake_case name", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await itemFilter.execute({
    appId: "123",
    filters: { "876": [1, 2] },
    sortBy: "created_on",
    sortDesc: true,
    limit: 50,
    offset: 100,
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    filters: { "876": [1, 2] },
    sort_by: "created_on",
    sort_desc: true,
    limit: 50,
    offset: 100,
  });
});

/** `offset: 0` and `sortDesc: false` are meaningful and must survive. */
Deno.test("item-filter: zero and false are sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await itemFilter.execute({ appId: "1", offset: 0, sortDesc: false, limit: 0 }, ctx);
  assertEquals(bodyOf(calls[0]), { offset: 0, sort_desc: false, limit: 0 });
});

/**
 * Podio's `remember` flag would overwrite the connected user's "last used view"
 * in the Podio UI. A workflow's filter is not a human's browsing state.
 */
Deno.test("item-filter: never sends `remember`", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await itemFilter.execute({ appId: "1", filters: { a: 1 } }, ctx);
  assertEquals(bodyOf(calls[0]).remember, undefined);
});

Deno.test("item-filter: unparseable filters fail before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(itemFilter.execute({ appId: "1", filters: "{bad" }, ctx)),
    Error,
    "Filters is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-filter: a bodyless response yields empty counts rather than undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await itemFilter.execute({ appId: "1" }, ctx), { items: [], total: 0, filtered: 0 });
});
