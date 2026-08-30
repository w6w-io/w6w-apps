import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-item.ts";

Deno.test("get-item: GETs {site}/lists/{list-id}/items/{item-id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42" } }]);
  await action.execute({ listId: "L1", itemId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/lists/L1/items/42");
});

Deno.test("get-item: expands `fields` by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ listId: "L1", itemId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), "fields");
});

Deno.test("get-item: Columns narrows the expand to fields(select=...)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ listId: "L1", itemId: "42", columns: ["Title"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), "fields(select=Title)");
});

Deno.test("get-item: turning off Expand column values drops $expand", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ listId: "L1", itemId: "42", expandFields: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), null);
});
