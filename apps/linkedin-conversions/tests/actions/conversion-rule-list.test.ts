import { assertEquals } from "@std/assert";
import conversionRuleList from "../../actions/conversion-rule-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversion-rule-list: finds by account, defaults start/count", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [], paging: { start: 0, count: 10 } } }]);
  await conversionRuleList.execute({ accountId: "519072844" }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/conversions");
  const q = queryOf(calls[0].url);
  assertEquals(q.q, "account");
  assertEquals(q.account, "urn:li:sponsoredAccount:519072844");
  assertEquals(q.start, "0");
  assertEquals(q.count, "10");
  assertEquals("conversionOwnershipTypes" in q, false);
});

Deno.test("conversion-rule-list: respects explicit start/count", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await conversionRuleList.execute({ accountId: "1", start: 20, count: 5 }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.start, "20");
  assertEquals(q.count, "5");
});

Deno.test("conversion-rule-list: passes conversionOwnershipTypes as a Rest.li List when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await conversionRuleList.execute({ accountId: "1", ownershipTypes: ["OWNED", "SHARED"] }, ctx);
  assertEquals(queryOf(calls[0].url).conversionOwnershipTypes, "List(OWNED,SHARED)");
});
