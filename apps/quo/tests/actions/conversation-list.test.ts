import { assertEquals } from "@std/assert";
import conversationList from "../../actions/conversation-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-list: GETs /v1/conversations with its filters", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [], totalItems: 0, nextPageToken: null },
  }]);
  await conversationList.execute(
    { phoneNumber: "PN1", excludeInactive: true, maxResults: 20 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/conversations");
  const q = queryOf(calls[0].url);
  assertEquals(q.phoneNumber, "PN1");
  assertEquals(q.excludeInactive, "true");
  assertEquals(q.maxResults, "20");
});

Deno.test("conversation-list: is a search action", () => {
  assertEquals(conversationList.type, "search");
});
