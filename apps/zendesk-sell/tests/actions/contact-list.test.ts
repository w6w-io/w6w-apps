import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: unwraps each item's own data envelope, not a bare array", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: 1, name: "A" }, { id: 2, name: "B" }]) },
  ]);
  const out = await contactList.execute({}, ctx) as { items: unknown[]; count: number };

  assertEquals(pathOf(calls[0].url), "/v2/contacts");
  assertEquals(out.items, [{ id: 1, name: "A" }, { id: 2, name: "B" }]);
  assertEquals(out.count, 2);
});

Deno.test("contact-list: maps camelCase params to the vendor's snake_case query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await contactList.execute({
    perPage: 50,
    sortBy: "last_name:desc",
    isOrganization: true,
    customerStatus: "current",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    per_page: "50",
    sort_by: "last_name:desc",
    is_organization: "true",
    customer_status: "current",
  });
});
