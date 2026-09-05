import { assertEquals } from "@std/assert";
import subscriberDeleteByEmail from "../../actions/subscriber-delete-by-email.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-delete-by-email: deletes via subscriber_email on the collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await subscriberDeleteByEmail.execute(
    { accountId: "1", listId: "2", email: "a@b.com" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers");
  assertEquals(queryOf(calls[0].url), { subscriber_email: "a@b.com" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 200 });
});
