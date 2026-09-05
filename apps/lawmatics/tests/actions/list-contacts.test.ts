import { assertEquals } from "@std/assert";
import listContacts from "../../actions/list-contacts.ts";
import { item, list, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-contacts: hits GET /v1/contacts and returns the envelope as-is", async () => {
  const { ctx, calls } = mockCtx([{
    body: list([item("1", "contact", { first_name: "Linda", last_name: "Baker" })]),
  }]);
  const out = await listContacts.execute({}, ctx) as {
    data: unknown[];
    meta: { total_pages: number };
  };

  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.data.length, 1);
  assertEquals(out.meta.total_pages, 1);
});

Deno.test("list-contacts: forwards fields/page/sort/filter as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: list([]) }]);
  await listContacts.execute({
    fields: "first_name,email",
    page: 3,
    sortBy: "created_at",
    sortOrder: "desc",
    filterBy: "status",
    filterOn: "active",
    filterWith: "=",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    fields: "first_name,email",
    page: "3",
    sort_by: "created_at",
    sort_order: "desc",
    filter_by: "status",
    filter_on: "active",
    filter_with: "=",
  });
});

Deno.test("list-contacts: omits unset query params entirely rather than sending blanks", async () => {
  const { ctx, calls } = mockCtx([{ body: list([]) }]);
  await listContacts.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
