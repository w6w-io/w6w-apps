import { assertEquals } from "@std/assert";
import subscriberGet from "../../actions/subscriber-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-get: fetches one subscriber by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 789, email: "a@b.com", status: "subscribed" } }]);
  const out = await subscriberGet.execute(
    { accountId: "1", listId: "2", subscriberId: "789" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers/789");
  assertEquals(out.email, "a@b.com");
});
