import { assertEquals } from "@std/assert";
import subscriberUpdate from "../../actions/subscriber-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-update: succeeds on the non-standard 209 status and returns the updated subscriber", async () => {
  const { ctx, calls } = mockCtx([{ status: 209, body: { id: 789, status: "unsubscribed" } }]);
  const out = await subscriberUpdate.execute(
    { accountId: "1", listId: "2", subscriberId: "789", status: "unsubscribed" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers/789");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(out.status, "unsubscribed");
});

/**
 * The whole point of this test: `tags` here is `{add, remove}`, a different
 * shape than the flat array `subscriber-add` sends for the same field name.
 */
Deno.test("subscriber-update: tags is an {add, remove} object, not a flat array", async () => {
  const { ctx, calls } = mockCtx([{ status: 209, body: { id: 789 } }]);
  await subscriberUpdate.execute(
    {
      accountId: "1",
      listId: "2",
      subscriberId: "789",
      addTags: ["vip"],
      removeTags: ["trial"],
    },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!).tags, { add: ["vip"], remove: ["trial"] });
});

Deno.test("subscriber-update: omits tags entirely when neither add nor remove is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 209, body: { id: 789 } }]);
  await subscriberUpdate.execute(
    { accountId: "1", listId: "2", subscriberId: "789", name: "New Name" },
    ctx,
  );
  assertEquals("tags" in JSON.parse(calls[0].body!), false);
});
