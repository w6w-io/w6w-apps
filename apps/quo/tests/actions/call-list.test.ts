import { assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("call-list: GETs /v1/calls with a single-element participants array (1:1 only)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [], totalItems: 0, nextPageToken: null },
  }]);
  await callList.execute(
    { phoneNumberId: "PN1", participant: "+15555555555", maxResults: 5 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/calls");
  assertEquals(queryAllOf(calls[0].url, "participants"), ["+15555555555"]);
  assertEquals(queryOf(calls[0].url).phoneNumberId, "PN1");
  assertEquals(queryOf(calls[0].url).maxResults, "5");
});

Deno.test("call-list: is a search action", () => {
  assertEquals(callList.type, "search");
});
