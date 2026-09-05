import { assertEquals } from "@std/assert";
import broadcastUpdate from "../../actions/broadcast-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The whole point of this test: unlike the subscriber/custom-field PATCH
 * endpoints, updating a broadcast is a PUT that answers a plain 200 — not
 * the non-standard 209.
 */
Deno.test("broadcast-update: PUTs and succeeds on a plain 200, not 209", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { broadcast_id: "1", subject: "New" } }]);
  const out = await broadcastUpdate.execute(
    { accountId: "1", listId: "2", broadcastId: "1", subject: "New" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(out.subject, "New");
});
