import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/company-enrichment.ts";

Deno.test("company-enrichment: GETs /companies/find (not /company-enrichment)", async () => {
  const body = envelope({ name: "Hunter", domain: "hunter.io" });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ domain: "hunter.io" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/companies/find");
  assertEquals(queryOf(calls[0].url).domain, "hunter.io");
  assertEquals(result, body);
});
