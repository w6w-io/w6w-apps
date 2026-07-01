import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-contacts.ts";

Deno.test("search-contacts: POSTs /crm/v3/objects/contacts/search with filter groups", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ id: "1" }] } }]);
  await action.execute!(
    {
      filterGroups: [
        { filters: [{ propertyName: "email", operator: "EQ", value: "a@x" }] },
      ],
      limit: 10,
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/contacts/search");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filterGroups[0].filters[0].propertyName, "email");
  assertEquals(body.limit, 10);
});
