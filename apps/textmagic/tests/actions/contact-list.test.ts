import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GETs /contacts with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }]) }]);
  await contactList.execute({ shared: 1, orderBy: "firstName", direction: "asc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts");
  assertEquals(queryOf(calls[0].url), { shared: "1", orderBy: "firstName", direction: "asc" });
});
