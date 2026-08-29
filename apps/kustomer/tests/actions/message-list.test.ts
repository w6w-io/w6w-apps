import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/message-list.ts";

Deno.test("message-list: GETs /conversations/{id}/messages with pagination", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [], meta: { page: 1 } } }]);
  const out = await action.execute({ conversationId: "c1", page: 1, pageSize: 10 }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/conversations/c1/messages?page=1&pageSize=10",
  );
  assertEquals(out, { data: [], meta: { page: 1 } });
});
