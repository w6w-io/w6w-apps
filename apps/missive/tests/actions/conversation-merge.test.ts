import { assertEquals } from "@std/assert";
import action from "../../actions/conversation-merge.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-merge: posts to /:id/merge with the target, unwraps the array", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversations: [{ id: "survivor" }] } }]);
  const out = await action.execute({ id: "src", target: "dst", subject: "Merged" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/conversations/src/merge");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { target: "dst", subject: "Merged" });
  assertEquals(out, { id: "survivor" });
});

Deno.test("conversation-merge: requires id and target", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "", target: "dst" }, ctx));
  await assertActionRejects(() => action.execute({ id: "src", target: "" }, ctx));
});
