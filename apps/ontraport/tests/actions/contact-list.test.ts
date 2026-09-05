import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: calls GET /1/Contacts and returns items + count", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }, { id: "2" }], 2) }]);
  const out = await contactList.execute({ range: 50 }, ctx) as { items: unknown[]; count?: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/Contacts");
  assertEquals(out.items.length, 2);
  assertEquals(out.count, 2);
});

Deno.test("contact-list: forwards sort/condition/search into the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await contactList.execute({
    sort: "lastname",
    sortDir: "desc",
    condition: { field: { field: "lastname" }, op: "=", value: { value: "Smith" } },
    search: "Mary",
    searchNotes: true,
    listFields: "id,firstname,lastname",
  }, ctx);

  const q = queryOf(calls[0].url);
  assertEquals(q.sort, "lastname");
  assertEquals(q.sortDir, "desc");
  assertEquals(q.search, "Mary");
  assertEquals(q.searchNotes, "1");
  assertEquals(q.listFields, "id,firstname,lastname");
  assertEquals(JSON.parse(q.condition), {
    field: { field: "lastname" },
    op: "=",
    value: { value: "Smith" },
  });
});
