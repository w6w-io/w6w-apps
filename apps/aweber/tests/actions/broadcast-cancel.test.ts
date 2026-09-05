import { assertEquals } from "@std/assert";
import broadcastCancel from "../../actions/broadcast-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("broadcast-cancel: posts to /cancel and returns the self_link", async () => {
  const { ctx, calls } = mockCtx([
    { body: { self_link: "https://api.aweber.com/1.0/accounts/1/lists/2/broadcasts/1" } },
  ]);
  const out = await broadcastCancel.execute(
    { accountId: "1", listId: "2", broadcastId: "1" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts/1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { self_link: "https://api.aweber.com/1.0/accounts/1/lists/2/broadcasts/1" });
});
