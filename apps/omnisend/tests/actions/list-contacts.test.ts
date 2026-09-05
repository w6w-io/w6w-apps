import { assert, assertEquals } from "@std/assert";
import listContacts from "../../actions/list-contacts.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-contacts: calls GET /contacts and returns the paginated body", async () => {
  const { ctx, calls } = mockCtx([
    { body: { contacts: [{ id: "c1" }], paging: { hasMore: false, limit: 100 } } },
  ]);
  const out = await listContacts.execute({}, ctx) as { contacts: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/contacts");
  assertEquals(out.contacts, [{ id: "c1" }]);
});

Deno.test("list-contacts: forwards filters and pagination as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await listContacts.execute({
    limit: 50,
    after: "cursor-1",
    sort: "updatedAt",
    direction: "asc",
    email: "a@b.com",
    status: "subscribed",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    limit: "50",
    after: "cursor-1",
    sort: "updatedAt",
    direction: "asc",
    email: "a@b.com",
    status: "subscribed",
  });
});

Deno.test("list-contacts: unset filters are omitted from the query string, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await listContacts.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

/** `tag` and `status` are documented as mutually exclusive — the hint says so, this proves it exists. */
Deno.test("list-contacts: the tag/status mutual-exclusion is documented on the params", () => {
  const tag = listContacts.params?.find((p) => p.key === "tag");
  const status = listContacts.params?.find((p) => p.key === "status");
  assert(/cannot be combined/i.test(tag?.hint ?? ""), tag?.hint);
  assert(/cannot be combined/i.test(status?.hint ?? ""), status?.hint);
});

Deno.test("list-contacts: is a read action", () => {
  assertEquals(listContacts.type, "read");
});
