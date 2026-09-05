import { assertEquals } from "@std/assert";
import conversationUpdateStatus from "../../actions/conversation-update-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-update-status: opens a conversation with just a status", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await conversationUpdateStatus.execute({ identifier: "id:1", status: "open" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/conversation/status");
  assertEquals(JSON.parse(calls[0].body!), { status: "open" });
});

Deno.test("conversation-update-status: closes with a category and summary", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await conversationUpdateStatus.execute(
    { identifier: "id:1", status: "close", category: "Resolved", summary: "Fixed it" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    status: "close",
    category: "Resolved",
    summary: "Fixed it",
  });
});

Deno.test("conversation-update-status: is declared idempotent", () => {
  assertEquals(conversationUpdateStatus.idempotent, true);
});
