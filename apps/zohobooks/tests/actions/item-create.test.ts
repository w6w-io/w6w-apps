import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/item-create.ts";

Deno.test("item-create: POSTs /items with name and rate", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", item: { item_id: "1" } } },
  ]);
  await action.execute({ fields: { name: "Hard Drive", rate: 120 } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/items");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Hard Drive", rate: 120 });
});
