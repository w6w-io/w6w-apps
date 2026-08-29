import { assertEquals } from "@std/assert";
import action from "../../actions/conversation-update.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-update: patches only the fields set, wraps id in an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversations: [{ id: "c1", subject: "New" }] } }]);
  const out = await action.execute({ id: "c1", subject: "New", close: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/conversations/c1");
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.conversations, [{ id: "c1", subject: "New", close: true }]);
  assertEquals(out, { id: "c1", subject: "New" });
});

Deno.test("conversation-update: builds id-list fields from comma-separated input", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversations: [{ id: "c1" }] } }]);
  await action.execute({ id: "c1", addAssignees: "u1, u2", organization: "org1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.conversations[0].add_assignees, ["u1", "u2"]);
});

Deno.test("conversation-update: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
