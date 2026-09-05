import { assertEquals } from "@std/assert";
import subscriberUpdateByEmail from "../../actions/subscriber-update-by-email.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-update-by-email: addresses the collection with subscriber_email", async () => {
  const { ctx, calls } = mockCtx([{ status: 209, body: { id: 789, email: "a@b.com" } }]);
  await subscriberUpdateByEmail.execute(
    { accountId: "1", listId: "2", email: "a@b.com", name: "New Name" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers");
  assertEquals(queryOf(calls[0].url), { subscriber_email: "a@b.com" });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
});
