import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-get: reads one company by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3", company_name: "Acme", groups: "1,5,12" } }]);
  const out = await companyGet.execute({ companyId: "3" }, ctx) as { groups: string };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/companies/3");
  // `groups` is a comma-delimited STRING of tag ids on a company, where a
  // contact also carries a real `tag_ids` array.
  assertEquals(out.groups, "1,5,12");
});

Deno.test("company-get: passes the fields selector through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await companyGet.execute({ companyId: "3", fields: "notes,website" }, ctx);
  assertEquals(queryOf(calls[0].url).fields, "notes,website");
});

Deno.test("company-get: the declared output names the comma-delimited tag string", () => {
  const field = (companyGet.output as Array<{ key: string; type: string }>).find(
    (f) => f.key === "groups",
  );
  assertEquals(field?.type, "string");
});
