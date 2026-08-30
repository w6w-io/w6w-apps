import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-item.ts";

Deno.test("create-item: POSTs to {site}/lists/{list-id}/items with a fields envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await action.execute(
    { listId: "L1", fields: { Title: "Widget", Color: "Purple", Weight: 32 } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/lists/L1/items");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    fields: { Title: "Widget", Color: "Purple", Weight: 32 },
  });
});

Deno.test("create-item: is not idempotent — every call mints a new row", () => {
  assertEquals(action.idempotent, false);
});
