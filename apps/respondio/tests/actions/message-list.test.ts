import { assertEquals } from "@std/assert";
import messageList from "../../actions/message-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-list: GETs /contact/{identifier}/message/list with pagination query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ messageId: 1 }]) }]);
  const out = await messageList.execute(
    { identifier: "id:1", limit: 50, cursorId: 100 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/message/list");
  assertEquals(queryOf(calls[0].url), { limit: "50", cursorId: "100" });
  assertEquals(out.items.length, 1);
});

Deno.test("message-list: is a search action", () => {
  assertEquals(messageList.type, "search");
});
