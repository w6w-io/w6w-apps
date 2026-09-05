import { assertEquals } from "@std/assert";
import subscriberMove from "../../actions/subscriber-move.ts";
import { created, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-move: builds a full self_link URL for the destination list", async () => {
  const { ctx, calls } = mockCtx([
    created("https://api.aweber.com/1.0/accounts/1/lists/9/subscribers/789"),
  ]);
  const out = await subscriberMove.execute(
    { accountId: "1", listId: "2", subscriberId: "789", destinationListId: "9" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers/789");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    "ws.op": "move",
    list_link: "https://api.aweber.com/1.0/accounts/1/lists/9",
  });
  assertEquals(out, {
    id: 789,
    location: "https://api.aweber.com/1.0/accounts/1/lists/9/subscribers/789",
  });
});

Deno.test("subscriber-move: is not marked idempotent", () => {
  assertEquals(subscriberMove.idempotent, false);
});
