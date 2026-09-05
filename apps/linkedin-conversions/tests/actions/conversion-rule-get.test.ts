import { assertEquals } from "@std/assert";
import conversionRuleGet from "../../actions/conversion-rule-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversion-rule-get: GETs by bare id with the account URN in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 104012, name: "test", type: "LEAD" } }]);
  const result = await conversionRuleGet.execute(
    { conversionId: "urn:lla:llaPartnerConversion:104012", accountId: "519072844" },
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/conversions/104012");
  assertEquals(queryOf(calls[0].url).account, "urn:li:sponsoredAccount:519072844");
  assertEquals(result, { id: 104012, name: "test", type: "LEAD" });
});
