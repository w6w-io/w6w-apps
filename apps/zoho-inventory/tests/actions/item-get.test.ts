import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

Deno.test("item-get: GETs /items/{id} with organization_id and unwraps item", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", item: { item_id: "1", name: "Hard Drive" } } },
  ]);
  const out = await action.execute({ recordId: "1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/items/1");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(out, { item_id: "1", name: "Hard Drive" });
});

/** Item is a SINGULAR key on a get and PLURAL on a list — mixing them throws. */
Deno.test("item-get: unwraps the singular `item` key, not `items`", async () => {
  const { ctx } = mockInventoryCtx([
    { body: { code: 0, message: "success", items: [{ item_id: "1" }] } },
  ]);
  let message = "";
  try {
    await action.execute({ recordId: "1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes('no "item" key'), true);
});
