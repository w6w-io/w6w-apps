import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pathOf, queryOf, rawQuery } from "../_helpers.ts";

const PAGE = { contacts: [{ id: "1" }, { id: "2" }], next_page_token: "tok2" };

Deno.test("contact-list: hits the v2 path and returns the page plus its cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await contactList.execute({ pageSize: 25 }, ctx) as {
    contacts: unknown[];
    count: number;
    nextPageToken?: string;
  };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts");
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url).page_size, "25");
  assertEquals(out.count, 2);
  assertEquals(out.nextPageToken, "tok2");
});

/**
 * The finding this endpoint turns on: there is no `?email=` parameter. Every
 * search term goes inside one `filter` string in Keap's expression grammar, and
 * a per-field parameter is silently ignored.
 */
Deno.test("contact-list: every search term lands inside one filter string", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactList.execute({ email: "jo@x.com", familyName: "Smi*", companyId: "9" }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.filter, "email==jo@x.com;family_name==Smi*;company_id==9");
  // And nothing leaked out as a parameter of its own.
  assertEquals(query.email, undefined);
  assertEquals(query.family_name, undefined);
});

Deno.test("contact-list: the filter is percent-encoded the way Keap's examples spell it", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactList.execute({ givenName: "Mar*" }, ctx);
  assertStringIncludes(rawQuery(calls[0].url), "filter=given_name%3D%3DMar%2A");
});

Deno.test("contact-list: a raw filter is appended to the typed clauses", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactList.execute({ email: "a@b.com", filter: "contact_id>5" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "email==a@b.com;contact_id>5");
});

/**
 * "`phone_number` … Requires `phone_fields` to be specified; only the specified
 * phone fields are searched." Without it the search matches nothing and returns
 * a confidently empty list.
 */
Deno.test("contact-list: a phone search without phone fields is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactList.execute({ phoneNumber: "5551234567" }, ctx),
    Error,
    "Phone fields to search is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-list: a phone search with phone fields sends both clauses", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactList.execute({ phoneNumber: "5551234567", phoneFields: "PHONE1,PHONE2" }, ctx);
  assertEquals(
    queryOf(calls[0].url).filter,
    "phone_number==5551234567;phone_fields==PHONE1,PHONE2",
  );
});

Deno.test("contact-list: no filter parameter at all when nothing was searched for", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).filter, undefined);
});

Deno.test("contact-list: an empty response is a zero count, not a crash", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await contactList.execute({}, ctx) as { count: number; nextPageToken?: string };
  assertEquals(out.count, 0);
  assertEquals(out.nextPageToken, undefined);
});

Deno.test("contact-list: the page size is prefilled small, because Keap documents no default", () => {
  const param = contactList.params?.find((p) => p.key === "pageSize");
  assertEquals(param?.default, 50);
  assert(contactList.type === "search");
});
