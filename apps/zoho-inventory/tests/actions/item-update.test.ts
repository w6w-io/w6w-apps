import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/item-update.ts";

Deno.test("item-update: PUTs /items/{id} with only the changed fields", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", item: { item_id: "1" } } },
  ]);
  const out = await action.execute({ recordId: "1", fields: { rate: 135 } }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/items/1");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { rate: 135 });
  assertEquals(out, { item_id: "1" });
});

Deno.test("item-update: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
