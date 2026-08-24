import { assertEquals } from "@std/assert";
import companyList from "../../actions/company-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-list: calls GET /company.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "c1", name: "Acme" }] }]);
  const out = await companyList.execute({ filter: "active eq 1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/company.json");
  assertEquals(queryOf(calls[0].url), { "$filter": "active eq 1" });
  assertEquals(out.items, [{ uuid: "c1", name: "Acme" }]);
});
