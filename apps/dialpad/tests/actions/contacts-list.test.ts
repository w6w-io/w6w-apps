import { assertEquals } from "@std/assert";
import contactsList from "../../actions/contacts-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contacts-list: GETs /contacts with the search filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ id: "1" }]) }]);
  await contactsList.execute({ name: "Jane", includeLocal: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts");
  assertEquals(queryOf(calls[0].url), { name: "Jane", include_local: "true" });
});
