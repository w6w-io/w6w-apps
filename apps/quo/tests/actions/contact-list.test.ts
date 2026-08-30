import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pathOf, queryAllOf } from "../_helpers.ts";

Deno.test("contact-list: GETs /v1/contacts, repeating externalIds/sources array filters", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [], totalItems: 0, nextPageToken: null },
  }]);
  await contactList.execute({ externalIds: ["e1", "e2"], sources: ["crm"], maxResults: 10 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(queryAllOf(calls[0].url, "externalIds"), ["e1", "e2"]);
  assertEquals(queryAllOf(calls[0].url, "sources"), ["crm"]);
});

Deno.test("contact-list: is a search action", () => {
  assertEquals(contactList.type, "search");
});
