import { assertEquals } from "@std/assert";
import clientListsForEmailGet from "../../actions/client-lists-for-email-get.ts";
import { API_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-lists-for-email-get: GETs listsforemail with the address in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await clientListsForEmailGet.execute({ clientId: "cid", email: "a@example.com" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/listsforemail.json`);
  assertEquals(queryOf(calls[0].url), { email: "a@example.com" });
});

/**
 * `+` is a legal local-part character and is the classic way an unencoded email
 * query parameter silently becomes a different address.
 */
Deno.test("client-lists-for-email-get: a plus in the address survives the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await clientListsForEmailGet.execute({ clientId: "cid", email: "a+tag@example.com" }, ctx);
  assertEquals(queryOf(calls[0].url).email, "a+tag@example.com");
  assertEquals(calls[0].url.includes("a%2Btag%40example.com"), true);
});

Deno.test("client-lists-for-email-get: returns each list with the subscriber's state", async () => {
  const body = [
    {
      ListID: "l1",
      ListName: "List One",
      SubscriberState: "Unsubscribed",
      DateSubscriberAdded: "2011-04-01 01:27:00",
    },
  ];
  const { ctx } = mockCtx([{ body }]);
  const out = await clientListsForEmailGet.execute({ clientId: "cid", email: "a@b.com" }, ctx);
  assertEquals(out, body);
});
