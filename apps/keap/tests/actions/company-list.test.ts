import { assertEquals } from "@std/assert";
import companyList from "../../actions/company-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { companies: [{ id: "1", company_name: "Acme" }], next_page_token: "n" };

Deno.test("company-list: reads the companies collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await companyList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/companies");
  assertEquals(out.count, 1);
});

/**
 * Keap declares both a wildcard-capable `name` and an equality-only
 * `company_name`. Reaching for the exact one with a trailing `*` returns
 * nothing, silently.
 */
Deno.test("company-list: the wildcard and the exact name clauses are distinct", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }, { body: PAGE }]);
  await companyList.execute({ name: "Acm*" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "name==Acm*");
  await companyList.execute({ companyName: "Acme Inc" }, ctx);
  assertEquals(queryOf(calls[1].url).filter, "company_name==Acme Inc");
});

Deno.test("company-list: the address clauses are sent as documented", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await companyList.execute({ city: "Chan*", state: "Arizona" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "city==Chan*;state==Arizona");
});

/**
 * "Fields such as notes, fax_number, address, email_address, phone_number,
 * update_time, create_time and custom_fields aren't included, by default."
 */
Deno.test("company-list: the fields selector names what would otherwise be omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await companyList.execute({ fields: "email_address,address" }, ctx);
  assertEquals(queryOf(calls[0].url).fields, "email_address,address");
});
