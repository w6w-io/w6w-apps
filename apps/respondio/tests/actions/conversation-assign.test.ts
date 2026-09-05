import { assertEquals } from "@std/assert";
import conversationAssign from "../../actions/conversation-assign.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-assign: a numeric assignee is sent as a number", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await conversationAssign.execute({ identifier: "id:1", assignee: "456" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/conversation/assignee");
  assertEquals(JSON.parse(calls[0].body!), { assignee: 456 });
});

Deno.test("conversation-assign: a non-numeric assignee is sent as-is (an email)", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await conversationAssign.execute({ identifier: "id:1", assignee: "agent@example.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { assignee: "agent@example.com" });
});

Deno.test("conversation-assign: an empty assignee unassigns (sends null)", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await conversationAssign.execute({ identifier: "id:1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { assignee: null });
});

Deno.test("conversation-assign: is declared idempotent", () => {
  assertEquals(conversationAssign.idempotent, true);
});
