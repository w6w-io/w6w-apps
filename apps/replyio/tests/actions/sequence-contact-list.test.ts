import { assertEquals } from "@std/assert";
import sequenceContactList from "../../actions/sequence-contact-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sequence-contact-list: GETs /v3/sequences/{id}/contacts with snake_case sort params", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ contactId: 1, statusInSequence: "active" }]) }]);
  await sequenceContactList.execute({ id: 9, sort_by: "email", sort_direction: "asc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/sequences/9/contacts");
  // Reply's own query params here are snake_case, unlike the rest of the v3 surface.
  assertEquals(queryOf(calls[0].url), { sort_by: "email", sort_direction: "asc" });
});
