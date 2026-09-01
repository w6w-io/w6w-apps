import { assertEquals } from "@std/assert";
import itemCreate from "../../actions/item-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("item-create: posts to /items, defaulting currency to INR", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "item_1", name: "Widget" } }]);
  await itemCreate.execute({ name: "Widget", amount: 9900 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/items");
  assertEquals(JSON.parse(calls[0].body!), { name: "Widget", amount: 9900, currency: "INR" });
});
