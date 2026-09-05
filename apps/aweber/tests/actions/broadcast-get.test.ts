import { assertEquals } from "@std/assert";
import broadcastGet from "../../actions/broadcast-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("broadcast-get: fetches one broadcast by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { broadcast_id: "1", subject: "Hello", status: "sent" },
  }]);
  const out = await broadcastGet.execute(
    { accountId: "1", listId: "2", broadcastId: "1" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts/1");
  assertEquals(out.subject, "Hello");
});
