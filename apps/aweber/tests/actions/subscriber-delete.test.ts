import { assertEquals } from "@std/assert";
import subscriberDelete from "../../actions/subscriber-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-delete: deletes by id and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await subscriberDelete.execute(
    { accountId: "1", listId: "2", subscriberId: "789" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers/789");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 200 });
});
