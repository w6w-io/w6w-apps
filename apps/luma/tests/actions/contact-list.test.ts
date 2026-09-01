import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: maps camelCase filters to Luma's snake_case query", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }]);
  await contactList.execute(
    { query: "ada", membershipStatus: "approved", paginationLimit: 25 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/calendars/contacts/list");
  assertEquals(queryOf(calls[0].url), {
    query: "ada",
    membership_status: "approved",
    pagination_limit: "25",
  });
});
