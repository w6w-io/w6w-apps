import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-appointment-type.ts";

Deno.test("create-appointment-type: POSTs /{accountId}/profiles/{profileId}/appointmenttypes/items", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "at-1" } }]);
  await action.execute(
    {
      accountId: "acc-1",
      profileId: "prof-1",
      name: "30 min consult",
      description: "A short intro call",
      slotLengthMinutes: 30,
      numberOfSlots: 1,
      price: 0,
      order: "1",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1/profiles/prof-1/appointmenttypes/items");
  assertEquals(url.searchParams.get("order"), "1");
  assertEquals(
    JSON.parse(calls[0].body!),
    {
      name: "30 min consult",
      description: "A short intro call",
      slotLengthMinutes: 30,
      numberOfSlots: 1,
      price: 0,
    },
  );
});

Deno.test("create-appointment-type: defaults response fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "at-1" } }]);
  await action.execute({ accountId: "acc-1", profileId: "prof-1", name: "Intro" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.searchParams.get("fields"),
    "id,name,description,pic,slotLengthMinutes,numberOfSlots,price",
  );
});
