import { assertEquals } from "@std/assert";
import addressUpdate from "../../actions/address-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("address-update: PUTs to /addresses/{id} with only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("address", { id: 7 }) }]);
  await addressUpdate.execute({ addressId: "7", city: "Cambridge" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/addresses/7");
  assertEquals(JSON.parse(calls[0].body!), { city: "Cambridge" });
});

Deno.test("address-update: an empty discountCodes array survives compact() to clear discounts", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("address", { id: 7 }) }]);
  await addressUpdate.execute({ addressId: "7", discountCodes: [] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { discounts: [] });
});

Deno.test("address-update: is marked idempotent", () => {
  assertEquals(addressUpdate.idempotent, true);
});
