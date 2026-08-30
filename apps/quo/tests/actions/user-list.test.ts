import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: GETs /v1/users with optional pagination", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [], totalItems: 0, nextPageToken: null },
  }]);
  await userList.execute({ maxResults: 50 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(queryOf(calls[0].url).maxResults, "50");
});

Deno.test("user-list: maxResults is optional (unlike calls/messages/contacts/conversations)", () => {
  const param = userList.params?.find((p) => p.key === "maxResults");
  assertEquals(param?.required, false);
});

Deno.test("user-list: is a search action", () => {
  assertEquals(userList.type, "search");
});
