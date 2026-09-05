import { assertEquals } from "@std/assert";
import purchaseCreate from "../../actions/purchase-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("purchase-create: posts a purchase event and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await purchaseCreate.execute(
    { accountId: "1", listId: "2", email: "a@b.com", value: 49.99, currency: "USD" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/purchases");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", value: 49.99, currency: "USD" });
  assertEquals(out, { status: 200 });
});

Deno.test("purchase-create: is not marked idempotent", () => {
  assertEquals(purchaseCreate.idempotent, false);
});
