import { assertEquals } from "@std/assert";
import giftCreate from "../../actions/gift-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("gift-create: POSTs to /api/v1/constituents/{id}/gifts.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, received_amount: 100 } }]);
  await giftCreate.execute({ constituent_id: 7, gift_type_name: "Cash" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/constituents/7/gifts.json");
  assertEquals(calls[0].method, "POST");
});

Deno.test("gift-create: sends only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await giftCreate.execute(
    { constituent_id: 7, gift_type_name: "Cash", received_amount: 100 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { gift_type_name: "Cash", received_amount: 100 });
});

Deno.test("gift-create: an optional numeric gift_type_id is included when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await giftCreate.execute(
    { constituent_id: 7, gift_type_name: "Cash", gift_type_id: 3 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.gift_type_id, 3);
});
