import { assertEquals } from "@std/assert";
import messageList from "../../actions/message-list.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("message-list: GETs /v1/messages, repeating participants and passing filters", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [], totalItems: 0, nextPageToken: null },
  }]);
  await messageList.execute(
    {
      phoneNumberId: "PN1",
      participants: ["+15555555555", "+15555555556"],
      maxResults: 25,
      createdAfter: "2026-01-01T00:00:00Z",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/messages");
  assertEquals(queryOf(calls[0].url).phoneNumberId, "PN1");
  assertEquals(queryAllOf(calls[0].url, "participants"), ["+15555555555", "+15555555556"]);
  assertEquals(queryOf(calls[0].url).maxResults, "25");
  assertEquals(queryOf(calls[0].url).createdAfter, "2026-01-01T00:00:00Z");
});

Deno.test("message-list: is a search action", () => {
  assertEquals(messageList.type, "search");
});
